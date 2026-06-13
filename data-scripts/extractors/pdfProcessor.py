import asyncio
import os
import io
import csv
import re
import json
import time
import math
from pathlib import Path

import pdfplumber
import pandas as pd

from backboard import BackboardClient

# ── Configuration ──────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
SCHEMA_PATH = BASE_DIR / "schema.json"
INPUTS_DIR = BASE_DIR / "inputs"
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_FILE = OUTPUT_DIR / "monte_carlo_final_data.csv"
API_KEY = os.environ.get("BACKBOARD_API_KEY", "")

MAX_RETRIES = 3
INITIAL_BACKOFF_S = 2
CONTEXT_CHAR_LIMIT = 85000
MIN_TEXT_CHARS = 80

# ── Load schema ───────────────────────────────────────────────
def load_schema():
    raw = json.loads(SCHEMA_PATH.read_text())
    return raw["metrics"]

METRICS_SCHEMA = load_schema()
SCHEMA_METRIC_NAMES = {m["metric_name"] for m in METRICS_SCHEMA}

# ── PDF validation ────────────────────────────────────────────
def is_scanned_pdf(pdf_path, text_sample=None):
    if text_sample is None:
        with pdfplumber.open(pdf_path) as pdf:
            total_chars = sum(len((page.extract_text() or "")) for page in pdf.pages)
        return total_chars < MIN_TEXT_CHARS
    return len(text_sample.strip()) < MIN_TEXT_CHARS


def ocr_extract(pdf_path):
    try:
        import pytesseract
        from pdf2image import convert_from_path
    except ImportError:
        print("   ⚠️ OCR dependencies not installed. Install: pytesseract + pdf2image + tesseract-ocr")
        return ""
    try:
        images = convert_from_path(pdf_path, dpi=300)
        text_blocks = []
        for i, img in enumerate(images):
            text = pytesseract.image_to_string(img, lang="eng")
            text_blocks.append(f"--- OCR PAGE {i+1} ---\n{text}")
        return "\n".join(text_blocks)
    except Exception as e:
        print(f"   ⚠️ OCR extraction failed: {e}")
        return ""


# ── Structured table extraction ───────────────────────────────
def extract_structured_tables(pdf_path):
    tables_data = []
    raw_text_parts = []
    total_chars = 0

    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            page_text = page.extract_text() or ""
            raw_text_parts.append(f"--- PAGE {i+1} ---\n{page_text}")
            total_chars += len(page_text)

            tables = page.extract_tables()
            for ti, table in enumerate(tables):
                if not table or len(table) < 2:
                    continue
                rows = []
                for row in table:
                    clean = [str(c).replace("\n", " ").strip() if c else "" for c in row]
                    rows.append(clean)

                headers = rows[0]
                data_rows = rows[1:]

                table_obj = {
                    "page": i + 1,
                    "table_index": ti,
                    "headers": headers,
                    "rows": data_rows,
                }
                tables_data.append(table_obj)

    is_scanned = total_chars < MIN_TEXT_CHARS
    raw_text = "\n".join(raw_text_parts)

    return tables_data, raw_text, is_scanned


def format_tables_for_prompt(tables_data):
    if not tables_data:
        return ""
    blocks = []
    for tbl in tables_data[:20]:
        header_str = " | ".join(tbl["headers"])
        lines = [header_str, "-" * len(header_str)]
        for row in tbl["rows"][:30]:
            lines.append(" | ".join(row))
        blocks.append(f"Table (Page {tbl['page']}):\n" + "\n".join(lines))
    return "\n\n".join(blocks)


# ── Period extraction (improved) ──────────────────────────────
FISCAL_MONTH_ORDER = [
    "april", "may", "june", "july", "august", "september",
    "october", "november", "december", "january", "february", "march",
]
MONTH_QUARTER = {
    "april": 1, "may": 1, "june": 1,
    "july": 2, "august": 2, "september": 2,
    "october": 3, "november": 3, "december": 3,
    "january": 4, "february": 4, "march": 4,
}
MONTH_ABBR = {
    "jan": "january", "feb": "february", "mar": "march",
    "apr": "april", "may": "may", "jun": "june",
    "jul": "july", "aug": "august", "sep": "september",
    "oct": "october", "nov": "november", "dec": "december",
}


def detect_period(text):
    if not text or len(text) < 10:
        return "Unknown Period"

    text_lower = text.lower()
    search_text = text_lower[:6000] + " ||| " + text_lower[-3000:]

    months_joined = "|".join(MONTH_ABBR.keys())
    pattern_date = rf"(\d{{1,2}})?\s*({months_joined})[a-z]*[\s,/-]+(\d{{4}})"
    pattern_q = r"(q[1-4]|quarter\s*[1-4])\s*(?:fy|fiscal\s*year)?\s*(\d{2,4})"

    matches_date = re.findall(pattern_date, search_text, re.IGNORECASE)
    matches_q = re.findall(pattern_q, search_text, re.IGNORECASE)

    best = None

    for m in matches_date:
        prefix, mon_abbr, year_str = m
        month_name = MONTH_ABBR.get(mon_abbr.lower())
        if not month_name or not year_str.isdigit():
            continue
        year = int(year_str)

        q = MONTH_QUARTER[month_name]
        fy_end_year = year if month_name in ("january", "february", "march") else year + 1
        fy_short = str(fy_end_year)[-2:]
        month_cap = month_name.capitalize()

        candidate = f"FY{fy_short}-Q{q} ({month_cap} {year})"
        if best is None:
            best = candidate

    for m in matches_q:
        q_part = re.sub(r"quarter\s*", "", m[0].lower()).replace("q", "").strip()
        year_str = m[1]
        if not q_part.isdigit() or not year_str.isdigit():
            continue
        q_num = int(q_part)
        year = int(year_str) if len(year_str) == 4 else 2000 + int(year_str)
        quarter_months = {1: "March", 2: "June", 3: "September", 4: "December"}
        month_name = quarter_months.get(q_num, "March")
        fy_short = str(year)[-2:]
        candidate = f"FY{fy_short}-Q{q_num} ({month_name} {year})"
        if best is None:
            best = candidate

    return best or "Unknown Period"


# ── AI response parser ────────────────────────────────────────
def parse_ai_response(content, detected_period):
    data = {"period": detected_period}
    content = content.strip()
    content = re.sub(r"```(?:csv|json|markdown)?", "", content)
    content = re.sub(r"```", "", content).strip()

    try:
        f = io.StringIO(content)
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 2:
                metric = row[0].strip()
                val = row[1].strip()
                val = re.sub(r"[^0-9.-]", "", val)
                if not val or val == "-":
                    val = "0"
                try:
                    float_val = float(val)
                    if metric in SCHEMA_METRIC_NAMES:
                        data[metric] = float_val
                except ValueError:
                    continue
        if len(data) > 1:
            return data
    except Exception:
        pass

    try:
        json_match = re.search(r"\{[^{}]*\}", content, re.DOTALL)
        if json_match:
            json_data = json.loads(json_match.group(0))
            for metric, val in json_data.items():
                if metric in SCHEMA_METRIC_NAMES:
                    try:
                        if isinstance(val, str):
                            val = re.sub(r"[^0-9.-]", "", val)
                            val = float(val) if val else 0.0
                        data[metric] = float(val)
                    except (ValueError, TypeError):
                        data[metric] = 0.0
            if len(data) > 1:
                return data
    except Exception:
        pass

    try:
        lines = content.split("\n")
        for line in lines:
            match = re.match(r"([a-z_]+)[\s:,]+([0-9.,\-]+)", line.lower().strip())
            if match:
                metric = match.group(1).strip()
                val = match.group(2).strip()
                val = re.sub(r"[^0-9.-]", "", val)
                if not val:
                    val = "0"
                try:
                    if metric in SCHEMA_METRIC_NAMES:
                        data[metric] = float(val)
                except ValueError:
                    continue
        if len(data) > 1:
            return data
    except Exception:
        pass

    return data


# ── Exponential backoff retry ─────────────────────────────────
async def call_with_retry(client, pdf_path, filtered_context, detected_period, schema_str):
    system_prompt = """
    You are a Financial Data Engine specialized in extracting metrics from financial statements.

    TASK: Extract financial metrics for Monte Carlo simulation.

    RULES:
    1. Convert "Lakhs" (*100,000) or "Crores" (*10,000,000) to absolute integers.
    2. If a metric is missing, return 0. Do NOT use N/A, null, or empty.
    3. Output CSV format: metric_name,value (one per line).
    4. Use EXACT metric names from the schema provided.
    """

    context_to_send = filtered_context[:CONTEXT_CHAR_LIMIT]
    if len(filtered_context) > CONTEXT_CHAR_LIMIT:
        print(f"   ⚠️ Context truncated from {len(filtered_context)} to {len(context_to_send)} chars")

    user_message = f"""
    EXTRACT FINANCIAL METRICS

    Period to Extract: "{detected_period}"

    Financial Statement Data:
    {context_to_send}

    Required Metrics Schema:
    {schema_str}

    INSTRUCTIONS:
    1. Extract ALL metrics for the period: "{detected_period}".
    2. If a metric is missing, use 0 (not N/A).
    3. If "gross_profit" is missing, calculate: revenue_total - cost_of_revenue.
    4. Output in CSV format: metric_name,value
    5. Use EXACT metric names from the schema.
    """

    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            print(f"   🤖 AI Analysis (Attempt {attempt+1}/{MAX_RETRIES})...")
            assistant_obj = await client.create_assistant(
                name=f"FinEngine_{int(time.time())}",
                system_prompt=system_prompt,
            )
            thread = await client.create_thread(assistant_id=assistant_obj.assistant_id)
            response = await client.add_message(
                thread_id=thread.thread_id,
                content=user_message,
            )
            content = getattr(response, "content", str(response)).strip()
            if not content:
                print(f"   ⚠️ Empty response")
                continue

            data = parse_ai_response(content, detected_period)
            if len(data) <= 1:
                print(f"   ⚠️ No metrics extracted")
                if attempt < MAX_RETRIES - 1:
                    backoff = INITIAL_BACKOFF_S * (2 ** attempt)
                    print(f"   ⏳ Retrying in {backoff}s...")
                    await asyncio.sleep(backoff)
                    continue
                return None

            key_metrics = ["revenue_total", "net_income", "cash_end_period", "total_assets"]
            has_key = any(m in data for m in key_metrics)
            if not has_key and attempt < MAX_RETRIES - 1:
                print(f"   ⚠️ Missing key metrics, retrying...")
                backoff = INITIAL_BACKOFF_S * (2 ** attempt)
                await asyncio.sleep(backoff)
                continue

            print(f"   ✅ Extracted {len(data)-1} metrics")
            return data

        except Exception as e:
            last_error = e
            print(f"   ⚠️ Attempt {attempt+1} error: {e}")
            if attempt < MAX_RETRIES - 1:
                backoff = INITIAL_BACKOFF_S * (2 ** attempt)
                print(f"   ⏳ Retrying in {backoff}s...")
                await asyncio.sleep(backoff)

    print(f"   ❌ Failed after {MAX_RETRIES} attempts. Last error: {last_error}")
    return None


# ── Single PDF processing ─────────────────────────────────────
async def process_file(client, pdf_path):
    filename = os.path.basename(pdf_path)
    print(f"\n{'='*60}")
    print(f"Processing: {filename}")
    print(f"{'='*60}")

    tables_data, raw_text, is_scanned = extract_structured_tables(pdf_path)

    if is_scanned:
        print(f"   📄 Scanned PDF detected — attempting OCR...")
        ocr_text = ocr_extract(pdf_path)
        if ocr_text and len(ocr_text.strip()) > MIN_TEXT_CHARS:
            raw_text = ocr_text
            tables_data = []
            print(f"   ✅ OCR extracted {len(ocr_text)} chars")
        else:
            print(f"   ⚠️ OCR produced insufficient text. Falling through with {len(raw_text)} chars.")

    if len(raw_text.strip()) < MIN_TEXT_CHARS:
        print(f"   ❌ Insufficient text ({len(raw_text.strip())} chars). Skipping.")
        return None

    formatted_tables = format_tables_for_prompt(tables_data)
    if formatted_tables:
        filtered_context = f"""STRUCTURED TABLES FROM FINANCIAL STATEMENTS:
{formatted_tables}

RAW TEXT (for context):
{raw_text[:30000]}"""
    else:
        filtered_context = raw_text

    detected_period = detect_period(raw_text[:5000] + raw_text[-3000:])
    print(f"   📅 Detected Period: {detected_period}")

    schema_str = json.dumps(METRICS_SCHEMA, indent=2)
    return await call_with_retry(client, pdf_path, filtered_context, detected_period, schema_str)


# ── Validation & CSV ──────────────────────────────────────────
def validate_extracted_data(data):
    if not data or "period" not in data:
        return False
    has_metrics = any(m in data for m in SCHEMA_METRIC_NAMES)
    if not has_metrics:
        return False
    key_metrics = ["revenue_total", "net_income", "total_assets"]
    has_non_zero = any(data.get(m, 0) != 0 for m in key_metrics)
    return has_non_zero


def save_to_csv(results):
    if not results:
        return
    schema_cols = [m["metric_name"] for m in METRICS_SCHEMA]
    columns = ["period"] + schema_cols

    df = pd.DataFrame(results)
    for col in columns:
        if col not in df.columns:
            df[col] = 0.0

    df["gross_profit"] = df.apply(
        lambda row: row["revenue_total"] - row["cost_of_revenue"]
        if row["gross_profit"] == 0 and row["revenue_total"] != 0 and row["cost_of_revenue"] != 0
        else row["gross_profit"],
        axis=1,
    )
    df["operating_expenses_total"] = df.apply(
        lambda row: (
            row["employee_costs"]
            + row["selling_marketing_expense"]
            + row["general_admin_expense"]
        )
        if row["operating_expenses_total"] == 0
        else row["operating_expenses_total"],
        axis=1,
    )

    df = df[columns]

    # Sort periods chronologically; push "Unknown Period" to end
    df["_sort_key"] = df["period"].apply(
        lambda p: p if p != "Unknown Period" else "zzzzzz"
    )
    df = df.sort_values(by="_sort_key").drop(columns=["_sort_key"])

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"   💾 CSV saved to {OUTPUT_FILE}")


# ── Main ──────────────────────────────────────────────────────
async def main():
    if not INPUTS_DIR.exists():
        print(f"❌ Input folder missing: {INPUTS_DIR}")
        return

    if not API_KEY:
        print("❌ BACKBOARD_API_KEY not set in environment")
        return

    try:
        client = BackboardClient(api_key=API_KEY)
    except Exception as e:
        print(f"❌ Failed to initialize Backboard client: {e}")
        return

    pdf_files = sorted([f for f in INPUTS_DIR.iterdir() if f.suffix.lower() == ".pdf"])
    if not pdf_files:
        print(f"❌ No PDF files found in '{INPUTS_DIR}'")
        return

    print(f"📂 Found {len(pdf_files)} PDF file(s).")

    all_results = []
    failed_files = []

    for idx, pdf_path in enumerate(pdf_files, 1):
        print(f"\n[{idx}/{len(pdf_files)}] {pdf_path.name}")
        try:
            result = await process_file(client, pdf_path)
            if result and validate_extracted_data(result):
                all_results.append(result)
                save_to_csv(all_results)
                print(f"   ✅ Success")
            else:
                failed_files.append((pdf_path.name, "Validation failed"))
        except Exception as e:
            print(f"   ❌ Error: {e}")
            import traceback
            traceback.print_exc()
            failed_files.append((pdf_path.name, str(e)))

    print(f"\n{'='*60}")
    print(f"SUMMARY: {len(all_results)}/{len(pdf_files)} succeeded")
    if failed_files:
        print(f"Failed:")
        for name, reason in failed_files:
            print(f"   - {name}: {reason}")
    print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(main())
