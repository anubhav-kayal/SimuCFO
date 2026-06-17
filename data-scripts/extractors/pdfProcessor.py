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


# ── Statement type detection (PDF chunking) ───────────────────
STATEMENT_PATTERNS = {
    "income_statement": [
        r"(?i)(profit\s*(and|&)\s*loss|income\s*statement|statement\s*of\s*profit|p\s*[&and]\s*l|trading\s*account|revenue\s*statement)",
        r"(?i)(revenue|sales|turnover|gross\s*profit|cogs|cost\s*of\s*goods|operating\s*income|net\s*income|earnings)",
        r"(?i)(income\s*tax|tax\s*expense|profit\s*before\s*tax|ebit|ebitda)",
    ],
    "balance_sheet": [
        r"(?i)(balance\s*sheet|statement\s*of\s*financial\s*position|financial\s*position|assets\s*(and|&)\s*liabilities)",
        r"(?i)(current\s*assets|fixed\s*assets|intangible\s*assets|total\s*assets|shareholders?\s*equity)",
        r"(?i)(liabilities|borrowings|debt|equity|share\s*capital|reserves|net\s*worth)",
    ],
    "cash_flow": [
        r"(?i)(cash\s*flow|statement\s*of\s*cash\s*flows|cash\s*flow\s*statement|funds\s*flow)",
        r"(?i)(operating\s*cash\s*flow|cash\s*from\s*operations|investing\s*activities|financing\s*activities)",
        r"(?i)(net\s*change\s*in\s*cash|closing\s*cash|ending\s*cash|cash\s*at\s*end)",
    ],
}


def detect_statement_type(text: str) -> str:
    if not text or len(text.strip()) < 20:
        return "unknown"
    scores = {}
    for stmt_type, patterns in STATEMENT_PATTERNS.items():
        score = 0
        for pattern in patterns:
            matches = re.findall(pattern, text)
            score += len(matches) * 2
        names = {
            "income_statement": ["profit", "loss", "revenue", "income statement", "p&l"],
            "balance_sheet": ["balance sheet", "assets", "liabilities", "equity"],
            "cash_flow": ["cash flow", "cashflow"],
        }
        for keyword in names.get(stmt_type, []):
            score += len(re.findall(rf"(?i){re.escape(keyword)}", text))
        scores[stmt_type] = score
    text_lower = text.lower()
    header_lines = [l.strip().lower() for l in text.split("\n") if l.strip() and len(l.strip()) < 100]
    for line in header_lines[:10]:
        if re.search(r"(?i)(profit\s*(and|&)\s*loss|income\s*statement)", line):
            scores["income_statement"] += 10
        if re.search(r"(?i)(balance\s*sheet|statement\s*of\s*financial\s*position)", line):
            scores["balance_sheet"] += 10
        if re.search(r"(?i)(cash\s*flow|statement\s*of\s*cash\s*flows)", line):
            scores["cash_flow"] += 10
    best = max(scores, key=scores.get)
    return best if scores[best] >= 3 else "unknown"


def chunk_pdf_by_statement(tables_data: list, raw_text: str) -> dict:
    chunks = {
        "income_statement": {"tables": [], "text": ""},
        "balance_sheet": {"tables": [], "text": ""},
        "cash_flow": {"tables": [], "text": ""},
        "unknown": {"tables": [], "text": ""},
    }
    for tbl in tables_data:
        table_text = " ".join(tbl["headers"]) + " " + " ".join(
            " ".join(row) for row in tbl["rows"]
        )
        stmt_type = detect_statement_type(table_text)
        chunks[stmt_type]["tables"].append(tbl)
        chunks[stmt_type]["text"] += f"\n--- {stmt_type} table ---\n{table_text[:3000]}\n"
    pages = raw_text.split("--- PAGE")
    for page_text in pages:
        if not page_text.strip():
            continue
        stmt_type = detect_statement_type(page_text)
        chunks[stmt_type]["text"] += f"\n--- {stmt_type} text ---\n{page_text[:5000]}\n"
    return chunks


def format_chunked_prompt(chunks: dict, detected_period: str, schema_str: str) -> str:
    sections = []
    statement_labels = {
        "income_statement": "PROFIT & LOSS STATEMENT (Income Statement)",
        "balance_sheet": "BALANCE SHEET",
        "cash_flow": "CASH FLOW STATEMENT",
        "unknown": "OTHER FINANCIAL DATA",
    }
    category_metrics = {
        "income_statement": [],
        "balance_sheet": [],
        "cash_flow": [],
        "operating_metrics": [],
    }
    for m in METRICS_SCHEMA:
        cat = m.get("statement_type", "income_statement")
        category_metrics.setdefault(cat, []).append(m["metric_name"])
    for stmt_type in ["income_statement", "balance_sheet", "cash_flow", "unknown"]:
        chunk = chunks.get(stmt_type, {"tables": [], "text": ""})
        if not chunk["tables"] and not chunk["text"].strip():
            continue
        label = statement_labels.get(stmt_type, stmt_type)
        section = f"=== {label} ==="
        if chunk["tables"]:
            section += "\n\nStructured Tables:\n"
            section += format_tables_for_prompt(chunk["tables"])
        if chunk["text"].strip() and len(chunk["text"].strip()) > 50:
            section += f"\n\nAdditional Text:\n{chunk['text'][:15000]}"
        sections.append(section)
    prompt = f"""EXTRACT FINANCIAL METRICS BY STATEMENT TYPE

Period to Extract: "{detected_period}"

The financial data below is organized by statement type (P&L, Balance Sheet, Cash Flow).
Extract metrics according to their category.

Metrics by category:
"""
    for cat, metrics in category_metrics.items():
        if metrics:
            prompt += f"\n{cat.replace('_', ' ').upper()}: {', '.join(metrics)}\n"
    prompt += f"""
Required Schema:
{schema_str}

Data:
{chr(10).join(sections)}

INSTRUCTIONS:
1. Extract ALL metrics for the period: "{detected_period}".
2. Match each metric to its correct statement category above.
3. If a metric is missing, use 0 (not N/A).
4. If "gross_profit" is missing, calculate: revenue_total - cost_of_revenue.
5. Output in CSV format: metric_name,value
6. Use EXACT metric names from the schema.
"""
    return prompt


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

    if filtered_context.strip().startswith("EXTRACT FINANCIAL METRICS BY STATEMENT TYPE"):
        user_message = filtered_context
    else:
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
        return None, None

    detected_period = detect_period(raw_text[:5000] + raw_text[-3000:])
    print(f"   📅 Detected Period: {detected_period}")

    schema_str = json.dumps(METRICS_SCHEMA, indent=2)

    chunks = chunk_pdf_by_statement(tables_data, raw_text)
    chunked_prompt = format_chunked_prompt(chunks, detected_period, schema_str)

    if len(chunked_prompt) > CONTEXT_CHAR_LIMIT:
        print(f"   ⚠️ Chunked prompt truncated from {len(chunked_prompt)} to {CONTEXT_CHAR_LIMIT} chars")
        chunked_prompt = chunked_prompt[:CONTEXT_CHAR_LIMIT]

    found_types = [t for t in ["income_statement", "balance_sheet", "cash_flow"] if chunks[t]["tables"] or len(chunks[t].get("text", "")) > 100]
    if found_types:
        print(f"   📑 Statements detected: {', '.join(t.replace('_', ' ').title() for t in found_types)}")
    else:
        print(f"   📑 No clear statement type detected — using full context")

    filtered_context = chunked_prompt
    result = await call_with_retry(client, pdf_path, filtered_context, detected_period, schema_str)
    return result, chunks


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


# ── Data Quality Scoring ──────────────────────────────────────
QUALITY_WEIGHTS = {
    "source_structured_table": 1.0,
    "source_raw_text": 0.7,
    "source_ocr": 0.4,
    "source_derived": 0.6,
    "extracted_direct": 1.0,
    "extracted_zero": 0.3,
}

STATEMENT_EXPECTED_RANGES = {
    "income_statement": {
        "revenue_total": {"min": 0},
        "cost_of_revenue": {"min": 0},
        "gross_profit": {"min": 0},
        "operating_expenses_total": {"min": 0},
        "net_income": {},
        "operating_income": {},
    },
    "balance_sheet": {
        "total_assets": {"min": 0},
        "total_current_assets": {"min": 0},
        "cash_and_equivalents": {"min": 0},
        "short_term_investments": {"min": 0},
        "shareholders_equity": {},
        "total_liabilities": {"min": 0},
        "short_term_debt": {"min": 0},
        "long_term_debt": {"min": 0},
    },
    "cash_flow": {
        "cash_end_period": {},
        "cash_from_operations": {},
        "capital_expenditure": {"max": 0},
        "net_change_in_cash": {},
    },
    "operating_metrics": {
        "employee_count": {"min": 0, "max": 1_000_000},
        "customer_count": {"min": 0},
        "branch_count": {"min": 0},
    },
}


def get_metric_statement_type(metric_name: str) -> str:
    for m in METRICS_SCHEMA:
        if m["metric_name"] == metric_name:
            return m.get("statement_type", "unknown")
    return "unknown"


def score_data_quality(data: dict, is_scanned: bool = False, has_structured_tables: bool = False) -> dict:
    quality_scores = {}
    derived_metrics = {"gross_profit", "operating_expenses_total", "operating_income"}
    for metric_name in SCHEMA_METRIC_NAMES:
        flags = []
        value = data.get(metric_name)
        score = 1.0
        if is_scanned:
            score *= 0.4
            flags.append("ocr_scanned")
        elif not has_structured_tables:
            score *= 0.7
            flags.append("raw_text_only")
        if metric_name in derived_metrics:
            if value == 0:
                derived = False
                for other in derived_metrics:
                    if data.get(other, 0) != 0:
                        derived = True
                        break
                if derived:
                    score *= 0.6
                    flags.append("derived_calculated")
        if value == 0:
            score *= 0.3
            flags.append("zero_value")
        elif value is None:
            score = 0.0
            flags.append("missing")
        if value is not None and value != 0:
            stmt_type = get_metric_statement_type(metric_name)
            ranges = STATEMENT_EXPECTED_RANGES.get(stmt_type, {}).get(metric_name, {})
            if "min" in ranges and value < ranges["min"]:
                score *= 0.5
                flags.append(f"below_min_{ranges['min']}")
            if "max" in ranges and value > ranges["max"]:
                score *= 0.5
                flags.append(f"above_max_{ranges['max']}")
            if metric_name == "total_current_assets" and data.get("total_assets", 0) > 0:
                if value > data["total_assets"]:
                    score *= 0.3
                    flags.append("exceeds_total_assets")
            if metric_name == "gross_profit" and data.get("revenue_total", 0) > 0:
                if value > data["revenue_total"]:
                    score *= 0.3
                    flags.append("gross_profit_exceeds_revenue")
            if metric_name == "cash_end_period" and value < 0:
                score *= 0.7
                flags.append("negative_cash")
            if metric_name == "employee_count" and value > 0 and value < 1:
                score *= 0.3
                flags.append("implausible_employee_count")
        score = max(0.0, min(1.0, round(score, 2)))
        if score >= 0.8:
            label = "high"
        elif score >= 0.5:
            label = "medium"
        elif score >= 0.2:
            label = "low"
        else:
            label = "poor"
        quality_scores[metric_name] = {
            "score": score,
            "label": label,
            "flags": flags,
        }
    return quality_scores


def save_to_csv(results, chunks=None):
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
    all_chunks = []
    failed_files = []

    for idx, pdf_path in enumerate(pdf_files, 1):
        print(f"\n[{idx}/{len(pdf_files)}] {pdf_path.name}")
        try:
            result, chunks = await process_file(client, pdf_path)
            if result and validate_extracted_data(result):
                all_results.append(result)
                all_chunks.append(chunks)
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
