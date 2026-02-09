import os
import io
import csv
import re
import json
import asyncio
import pdfplumber
from pathlib import Path
from backboard import BackboardClient

# ======================================================
# CONFIG
# ======================================================
BASE_DIR = Path(__file__).resolve().parent
INPUTS_DIR = (BASE_DIR / "../inputs").resolve()
SCHEMA_PATH = (BASE_DIR / "../schema.json").resolve()
OUTPUT_CSV = BASE_DIR / "financial_timeseries.csv"

SCHEMA = json.loads(SCHEMA_PATH.read_text())
METRIC_NAMES = [m["metric_name"] for m in SCHEMA["metrics"]]

client = BackboardClient(
    api_key="Api key here"   # looks correct
)



# ======================================================
# INGESTION
# ======================================================
def load_pdf(path: Path) -> str:
    with pdfplumber.open(path) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)

# ======================================================
# PERIOD DETECTION (Quarter + FY)
# ======================================================
def detect_period(text: str) -> str:
    text = text.lower()

    quarter_map = {
        "june": "Q1",
        "september": "Q2",
        "december": "Q3",
        "march": "Q4"
    }

    month = None
    for m in quarter_map:
        if m in text:
            month = m
            break

    year_match = re.search(r"(20\d{2})", text)
    if not year_match:
        return "Unknown Period"

    year = int(year_match.group(1))
    quarter = quarter_map.get(month)

    if not quarter:
        return f"FY{str(year)[-2:]}"

    fy = year + 1 if month != "march" else year
    return f"{quarter} FY{str(fy)[-2:]} ({month.title()})"

# ======================================================
# SAFE JSON EXTRACTION (CRITICAL FIX)
# ======================================================
def safe_json_extract(raw: str) -> dict:
    if not raw:
        return {}

    raw = raw.strip()

    # Remove markdown
    raw = raw.replace("```json", "").replace("```", "")

    # Try direct load
    try:
        return json.loads(raw)
    except:
        pass

    # Try extracting first valid JSON block
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except:
            pass

    return {}

# ======================================================
# ASSISTANTS (CREATED ONCE)
# ======================================================
async def setup_assistants():
    doc_intel = await client.create_assistant(
        name="DocIntel",
        system_prompt="""
        Classify the financial document.
        Detect language and layout.
        Output STRICT JSON only.
        """
    )

    extractor = await client.create_assistant(
        name="Extractor",
        system_prompt="""
        Extract financial data strictly using the given schema.
        Normalize units.
        Missing values must be 0.
        Output CSV only: metric_name,value
        """
    )

    return doc_intel, extractor

# ======================================================
# DOCUMENT INTELLIGENCE
# ======================================================
async def analyze_document(text: str, assistant):
    thread = await client.create_thread(assistant_id=assistant.assistant_id)
    response = await client.add_message(
        thread_id=thread.thread_id,
        content=text[:90000]
    )
    return safe_json_extract(response.content)

# ======================================================
# METRIC EXTRACTION
# ======================================================
async def extract_metrics(text: str, period: str, assistant):
    thread = await client.create_thread(assistant_id=assistant.assistant_id)

    prompt = f"""
    CONTEXT:
    {text[:90000]}

    SCHEMA:
    {json.dumps(SCHEMA, indent=2)}

    PERIOD: {period}
    """

    response = await client.add_message(
        thread_id=thread.thread_id,
        content=prompt
    )

    content = response.content.replace("```csv", "").replace("```", "")
    reader = csv.reader(io.StringIO(content))

    data = {m: 0 for m in METRIC_NAMES}

    for row in reader:
        if len(row) >= 2 and row[0] in data:
            val = re.sub(r"[^0-9.-]", "", row[1])
            data[row[0]] = float(val) if val else 0.0

    return data

# ======================================================
# MAIN PIPELINE
# ======================================================
async def run():
    doc_intel_asst, extractor_asst = await setup_assistants()

    rows = []

    for pdf in sorted(INPUTS_DIR.glob("*.pdf")):
        text = load_pdf(pdf)
        period = detect_period(text)

        _ = await analyze_document(text, doc_intel_asst)  # kept for challenge
        metrics = await extract_metrics(text, period, extractor_asst)

        row = {
            "period": period,
            **metrics,
            "source_file": pdf.name
        }

        rows.append(row)

    return rows

# ======================================================
# WRITE CSV (EXACT FORMAT)
# ======================================================
def write_csv(rows):
    columns = ["period"] + METRIC_NAMES + ["source_file"]

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)

# ======================================================
# RUN
# ======================================================
if __name__ == "__main__":
    rows = asyncio.run(run())
    write_csv(rows)

    print(f"\n✅ Financial time-series written to: {OUTPUT_CSV}")