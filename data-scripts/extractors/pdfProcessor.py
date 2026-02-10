import asyncio
import os
import io
import csv
import re
import json
import pdfplumber
import pandas as pd
import time
from backboard import BackboardClient

# --- CONFIGURATION (Dynamic Paths for Monorepo) ---
# Finds the 'data-scripts' folder automatically
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) 
PDF_FOLDER_PATH = os.path.join(BASE_DIR, "inputs")
OUTPUT_FILE = os.path.join(BASE_DIR, "output", "monte_carlo_final_data.csv")
API_KEY = os.environ.get("BACKBOARD_API_KEY", "espr_v98ne5cw6JLXhlLiFQNJrRlEdqOeWRbKiFaAJQ4L7oc")

# 1. THE EXACT 32-METRIC SCHEMA (Identical to your working script)
METRICS_SCHEMA = [
    {"metric_name": "revenue_total", "aliases": ["total income", "interest earned", "revenue from operations", "sales"]},
    {"metric_name": "cost_of_revenue", "aliases": ["interest expended", "cost of goods sold", "cogs", "finance costs"]},
    {"metric_name": "gross_profit", "aliases": ["net interest income", "nii", "gross profit"]},
    {"metric_name": "operating_expenses_total", "aliases": ["operating expenses", "total expenditure", "total expenses"]},
    {"metric_name": "employee_costs", "aliases": ["employee benefit expenses", "payments to and provisions for employees", "staff costs"]},
    {"metric_name": "selling_marketing_expense", "aliases": ["selling and distribution expenses", "advertisement", "business promotion"]},
    {"metric_name": "rnd_expense", "aliases": ["research and development", "r&d expenses"]},
    {"metric_name": "general_admin_expense", "aliases": ["general and administrative expenses", "other expenses", "other operating expenses"]},
    {"metric_name": "operating_income", "aliases": ["operating profit", "profit before provisions and tax", "ebit"]},
    {"metric_name": "interest_expense", "aliases": ["finance costs", "interest costs"]},
    {"metric_name": "tax_expense", "aliases": ["tax expense", "total tax expenses", "provision for tax"]},
    {"metric_name": "net_income", "aliases": ["net profit", "profit after tax", "net profit for the period", "pat"]},
    
    # Cash Flow & Balance Sheet (Standard)
    {"metric_name": "cash_from_operations", "aliases": ["net cash flow from operating activities"]},
    {"metric_name": "capital_expenditure", "aliases": ["purchase of property, plant and equipment", "capex"]},
    {"metric_name": "cash_from_investing", "aliases": ["net cash flow from investing activities"]},
    {"metric_name": "cash_from_financing", "aliases": ["net cash flow from financing activities"]},
    {"metric_name": "dividends_paid", "aliases": ["dividend paid", "dividends on equity shares"]},
    {"metric_name": "net_change_in_cash", "aliases": ["net increase/(decrease) in cash"]},
    {"metric_name": "cash_end_period", "aliases": ["cash and cash equivalents at the end of the period"]},
    
    {"metric_name": "cash_and_equivalents", "aliases": ["cash and bank balances", "cash and cash equivalents"]},
    {"metric_name": "short_term_investments", "aliases": ["current investments", "investments"]},
    {"metric_name": "total_current_assets", "aliases": ["total current assets"]},
    {"metric_name": "total_assets", "aliases": ["total assets", "grand total - assets"]},
    {"metric_name": "short_term_debt", "aliases": ["short term borrowings"]},
    {"metric_name": "long_term_debt", "aliases": ["long term borrowings"]},
    {"metric_name": "total_liabilities", "aliases": ["total liabilities", "total capital and liabilities"]},
    {"metric_name": "shareholders_equity", "aliases": ["total equity", "net worth", "share capital + reserves"]},
    
    # Operational
    {"metric_name": "employee_count", "aliases": ["number of employees", "headcount"]},
    {"metric_name": "avg_employee_cost", "aliases": ["cost per employee"]},
    {"metric_name": "branch_count", "aliases": ["number of branches", "banking outlets"]},
    {"metric_name": "customer_count", "aliases": ["number of customers", "customer base"]},
    {"metric_name": "segment_revenue", "aliases": ["revenue by segment"]}
]

# 2. HELPER: Enhanced Period Finder with Multiple Patterns
def extract_period_from_text(text):
    """Extract period with multiple fallback patterns for different PDF formats."""
    if not text or len(text) < 10:
        return "Unknown Period"
    
    text_lower = text.lower()
    # Search in first 5000 chars (increased from 2000) and last 2000 chars
    search_text = text_lower[:5000] + " " + text_lower[-2000:] if len(text_lower) > 5000 else text_lower
    
    months_map = {
        "january": ("Q4", "January"), "february": ("Q4", "February"), "march": ("Q4", "March"),
        "april": ("Q1", "April"), "may": ("Q1", "May"), "june": ("Q1", "June"),
        "july": ("Q2", "July"), "august": ("Q2", "August"), "september": ("Q2", "September"),
        "october": ("Q3", "October"), "november": ("Q3", "November"), "december": ("Q3", "December")
    }
    
    # PATTERN 1: "Ended 30th September 2023" or "30 September 2023"
    # [\s-]* is valid because - is at the end
    pattern1 = r"(\d{1,2})?[\s-]*(january|february|march|april|may|june|july|august|september|october|november|december)[\s-]*(\d{1,2})?,?[\s-]*(\d{4})"
    matches1 = re.findall(pattern1, search_text)
    
    # PATTERN 2: "Q1 2024", "Q2 FY24", "Quarter 1 2024"
    pattern2 = r"(q[1-4]|quarter\s*[1-4])[\s-]*(?:fy|fiscal\s*year)?[\s-]*(\d{2,4})"
    matches2 = re.findall(pattern2, search_text)
    
    # PATTERN 3: Fixed the bad character range here
    # Changed [\s-/] to [\s\-/] to treat hyphen as a literal character
    pattern3 = r"(\d{1,2})[\s\-/]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-/]*(\d{4})"
    matches3 = re.findall(pattern3, search_text)
    
    month_abbr = {"jan": "january", "feb": "february", "mar": "march", "apr": "april",
                  "may": "may", "jun": "june", "jul": "july", "aug": "august",
                  "sep": "september", "oct": "october", "nov": "november", "dec": "december"}
    
    # Try Pattern 1 first (most common)
    for match in matches1:
        parts = [p.strip() for p in match if p and p.strip()]
        found_month = None
        found_year = None
        
        for p in parts:
            if p in months_map:
                found_month = p
            elif len(p) == 4 and p.isdigit():
                found_year = int(p)
        
        if found_month and found_year:
            q_label, month_name = months_map[found_month]
            fiscal_year = found_year if found_month in ["january", "february", "march"] else found_year + 1
            return f"{q_label} FY{str(fiscal_year)[2:]} ({month_name} {found_year})"
    
    # Try Pattern 2 (Q1 2024 format)
    for match in matches2:
        q_part = match[0].lower().replace("quarter", "").replace("q", "").strip()
        year_str = match[1] if len(match) > 1 else ""
        if q_part.isdigit() and year_str.isdigit():
            q_num = int(q_part)
            year = int(year_str) if len(year_str) == 4 else 2000 + int(year_str)
            # Find a month in the quarter
            quarter_months = {1: "March", 2: "June", 3: "September", 4: "December"}
            month_name = quarter_months.get(q_num, "March")
            return f"Q{q_num} FY{str(year)[2:]} ({month_name} {year})"
    
    # Try Pattern 3 (date format)
    for match in matches3:
        month_abbr_key = match[1].lower()[:3]
        if month_abbr_key in month_abbr:
            found_month = month_abbr[month_abbr_key]
            found_year = int(match[2])
            q_label, month_name = months_map[found_month]
            fiscal_year = found_year if found_month in ["january", "february", "march"] else found_year + 1
            return f"{q_label} FY{str(fiscal_year)[2:]} ({month_name} {found_year})"
    
    return "Unknown Period"

# 3. HELPER: Enhanced Page Selector with Better Filtering
def get_filtered_text(pdf_path):
    """Extract relevant financial pages with improved filtering logic."""
    print(f"📖 Scanning {os.path.basename(pdf_path)}...")
    relevant_text = ""
    
    # Expanded keywords for better detection
    keywords = [
        "revenue", "income", "profit", "assets", "liabilities", "cash flow", 
        "consolidated", "standalone", "statement", "balance sheet", "operations",
        "financial position", "earnings", "expenses", "equity", "debt"
    ]
    
    # Target headers that indicate financial statements
    target_headers = [
        "statement of operations", "income statement", "profit and loss",
        "balance sheet", "statement of financial position",
        "cash flow", "statement of cash flows",
        "statement of equity", "shareholders equity"
    ]
    
    context_pages_text = "" 
    pages_kept = 0
    total_pages = 0

    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            
            for i, page in enumerate(pdf.pages):
                try:
                    text = page.extract_text()
                    if not text or len(text.strip()) < 50:
                        # Try to extract tables even if text is empty
                        tables = page.extract_tables()
                        if tables:
                            relevant_text += f"\n--- DATA PAGE {i+1} (Tables Only) ---\n"
                            for table in tables:
                                for row in table:
                                    clean_row = [str(cell).replace('\n', ' ') if cell else "" for cell in row]
                                    relevant_text += " | ".join(clean_row) + "\n"
                        continue
                    
                    # Always capture first 3 pages for period detection
                    if i < 3:
                        context_pages_text += text + "\n"
                    
                    text_lower = text.lower()
                    
                    # Check for target headers (strong signal)
                    has_header = any(header in text_lower for header in target_headers)
                    
                    # Score based on keywords
                    score = 0
                    for kw in keywords:
                        if kw in text_lower:
                            score += 1
                    
                    # Extract tables
                    tables = page.extract_tables()
                    has_tables = bool(tables)
                    if has_tables:
                        score += 5
                    
                    # Keep page if: has header OR (score >= 5) OR (first 5 pages) OR (has tables and score >= 3)
                    if has_header or score >= 5 or i < 5 or (has_tables and score >= 3):
                        if tables:
                            relevant_text += f"\n--- DATA PAGE {i+1} ---\n"
                            for table in tables:
                                for row in table:
                                    clean_row = [str(cell).replace('\n', ' ') if cell else "" for cell in row]
                                    relevant_text += " | ".join(clean_row) + "\n"
                        relevant_text += f"\n--- TEXT PAGE {i+1} ---\n{text}\n"
                        pages_kept += 1
                        
                except Exception as page_error:
                    print(f"   ⚠️ Error on page {i+1}: {page_error}")
                    continue
                    
    except Exception as e:
        print(f"❌ Error reading PDF: {e}")
        import traceback
        traceback.print_exc()
        return "", ""
    
    print(f"   📄 Extracted {pages_kept}/{total_pages} pages ({len(relevant_text)} chars)")
    
    # Fallback: if we got very little text, try to extract more pages
    if len(relevant_text) < 500 and total_pages > 0:
        print(f"   ⚠️ Low text extraction, attempting fallback...")
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for i in range(min(10, total_pages)):
                    try:
                        text = pdf.pages[i].extract_text()
                        if text:
                            relevant_text += f"\n--- FALLBACK PAGE {i+1} ---\n{text}\n"
                    except:
                        continue
        except:
            pass
    
    return relevant_text, context_pages_text

# 4. HELPER: Parse AI Response (Multiple Formats)
def parse_ai_response(content, detected_period):
    """Parse AI response in CSV, JSON, or markdown format."""
    data = {"period": detected_period}
    
    # Clean content
    content = content.strip()
    content = re.sub(r"```(?:csv|json|markdown)?", "", content)
    content = re.sub(r"```", "", content).strip()
    
    # Try CSV format first
    try:
        f = io.StringIO(content)
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 2:
                metric = row[0].strip()
                val = row[1].strip()
                # Remove currency symbols, commas, spaces
                val = re.sub(r"[^0-9.-]", "", val)
                if not val or val == "-": 
                    val = "0"
                try:
                    float_val = float(val)
                    if any(m['metric_name'] == metric for m in METRICS_SCHEMA):
                        data[metric] = float_val
                except ValueError:
                    continue
        if len(data) > 1:  # More than just period
            return data
    except Exception as e:
        pass
    
    # Try JSON format
    try:
        # Extract JSON from content
        json_match = re.search(r'\{[^{}]*\}', content, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            json_data = json.loads(json_str)
            for metric, val in json_data.items():
                if any(m['metric_name'] == metric for m in METRICS_SCHEMA):
                    try:
                        if isinstance(val, str):
                            val = re.sub(r"[^0-9.-]", "", val)
                            val = float(val) if val else 0.0
                        data[metric] = float(val)
                    except (ValueError, TypeError):
                        data[metric] = 0.0
            if len(data) > 1:
                return data
    except Exception as e:
        pass
    
    # Try line-by-line parsing (metric: value format)
    try:
        lines = content.split('\n')
        for line in lines:
            # Match "metric_name, value" or "metric_name: value"
            match = re.match(r'([a-z_]+)[\s:,]+([0-9.,\-]+)', line.lower().strip())
            if match:
                metric = match.group(1).strip()
                val = match.group(2).strip()
                val = re.sub(r"[^0-9.-]", "", val)
                if not val: val = "0"
                try:
                    if any(m['metric_name'] == metric for m in METRICS_SCHEMA):
                        data[metric] = float(val)
                except ValueError:
                    continue
        if len(data) > 1:
            return data
    except Exception as e:
        pass
    
    return data

# 5. CORE: Enhanced AI Extraction with Better Error Handling
async def process_file(client, pdf_path):
    """Process a single PDF file with comprehensive error handling."""
    filename = os.path.basename(pdf_path)
    print(f"\n{'='*60}")
    print(f"Processing: {filename}")
    print(f"{'='*60}")
    
    try:
        filtered_context, context_pages = get_filtered_text(pdf_path)
    except Exception as e:
        print(f"❌ Failed to extract text: {e}")
        return None
    
    if len(filtered_context) < 50:
        print(f"❌ Insufficient text extracted ({len(filtered_context)} chars)")
        return None
    
    detected_period = extract_period_from_text(context_pages)
    print(f"   📅 Detected Period: {detected_period}")
    
    schema_str = json.dumps(METRICS_SCHEMA, indent=2)

    system_prompt = """
    You are a Financial Data Engine specialized in extracting metrics from financial statements.
    
    TASK: Extract 32 exact metrics for Monte Carlo simulation.
    
    ────────────────────────
    BANKING MAPPING RULES
    ────────────────────────
    1. REVENUE: Sum "Interest Earned" + "Other Income" + "Non-Interest Income".
    2. COST OF REVENUE: Use "Interest Expended" or "Cost of Goods Sold".
    3. GROSS PROFIT: Use "Net Interest Income" (NII) or calculate as (Revenue - Cost of Revenue).
    4. ADMIN EXPENSE: If "Marketing" is missing, put ALL "Other Operating Expenses" here.
    
    ────────────────────────
    FORMATTING RULES
    ────────────────────────
    1. SCALE: Convert "Lakhs" (*100,000) or "Crores" (*10,000,000) to absolute integers.
    2. MISSING DATA: Return 0 (Zero). Do NOT use N/A, null, or empty.
    3. FORMAT: Output CSV format: metric_name,value (one per line).
    4. Use EXACT metric names from the schema provided.
    """

    # Truncate context to avoid token limits (keep it under 95k chars)
    context_to_send = filtered_context[:95000]
    if len(filtered_context) > 95000:
        print(f"   ⚠️ Context truncated from {len(filtered_context)} to {len(context_to_send)} chars")

    user_message = f"""
    EXTRACT FINANCIAL METRICS
    
    Period to Extract: "{detected_period}"
    
    Financial Statement Data:
    {context_to_send}
    
    Required Metrics Schema:
    {schema_str}
    
    INSTRUCTIONS:
    1. Extract ALL 32 metrics for the period: "{detected_period}".
    2. If a metric is missing, use 0 (not N/A).
    3. If "Gross Profit" is missing, calculate: Revenue - Cost of Revenue.
    4. Output in CSV format: metric_name,value
    5. Use EXACT metric names from the schema.
    """

    for attempt in range(3):
        try:
            print(f"   🤖 AI Analysis (Attempt {attempt+1}/3)...")
            
            assistant_obj = await client.create_assistant(
                name=f"FinEngineV10_{int(time.time())}", 
                system_prompt=system_prompt
            )
            thread = await client.create_thread(assistant_id=assistant_obj.assistant_id)
            
            response = await client.add_message(
                thread_id=thread.thread_id,
                content=user_message
            )
            
            content = getattr(response, 'content', str(response)).strip()
            if not content:
                print(f"   ⚠️ Empty response from AI")
                continue
            
            # Parse response
            data = parse_ai_response(content, detected_period)
            
            # Validate extracted data
            if len(data) <= 1:  # Only period, no metrics
                print(f"   ⚠️ No metrics extracted, response: {content[:200]}...")
                if attempt < 2:
                    time.sleep(2)
                    continue
                return None
            
            # Check if we got at least some key metrics
            key_metrics = ['revenue_total', 'net_income', 'cash_end_period', 'total_assets']
            has_key_metrics = any(metric in data for metric in key_metrics)
            
            if not has_key_metrics and attempt < 2:
                print(f"   ⚠️ Missing key metrics, retrying...")
                time.sleep(2)
                continue
            
            print(f"   ✅ Extracted {len(data)-1} metrics")
            return data

        except Exception as e:
            print(f"   ⚠️ Error (Attempt {attempt+1}/3): {e}")
            import traceback
            if attempt == 2:  # Last attempt, show full traceback
                traceback.print_exc()
            time.sleep(2)

    print(f"   ❌ Failed after 3 attempts")
    return None

# 6. MAIN + PYTHON MATH REPAIR with Enhanced Error Handling
async def main():
    if not os.path.exists(PDF_FOLDER_PATH):
        print(f"❌ Input folder missing: {PDF_FOLDER_PATH}")
        return

    try:
        client = BackboardClient(api_key=API_KEY)
    except Exception as e:
        print(f"❌ Failed to initialize Backboard client: {e}")
        return
    
    pdf_files = [f for f in os.listdir(PDF_FOLDER_PATH) if f.lower().endswith('.pdf')]
    if not pdf_files:
        print(f"❌ No PDF files found in '{PDF_FOLDER_PATH}'")
        return
    
    print(f"📂 Found {len(pdf_files)} PDF file(s) in 'inputs/'.")
    
    all_results = []
    failed_files = []
    
    for idx, pdf_file in enumerate(pdf_files, 1):
        print(f"\n[{idx}/{len(pdf_files)}] Processing: {pdf_file}")
        full_path = os.path.join(PDF_FOLDER_PATH, pdf_file)
        
        try:
            result = await process_file(client, full_path)
            
            if result:
                # Validate result before adding
                if validate_extracted_data(result):
                    all_results.append(result)
                    save_to_csv(all_results)
                    print(f"   ✅ Successfully processed and saved")
                else:
                    print(f"   ⚠️ Data validation failed, skipping")
                    failed_files.append((pdf_file, "Validation failed"))
            else:
                failed_files.append((pdf_file, "Extraction returned None"))
                
        except Exception as e:
            print(f"   ❌ Unexpected error: {e}")
            import traceback
            traceback.print_exc()
            failed_files.append((pdf_file, str(e)))
    
    # Summary
    print(f"\n{'='*60}")
    print(f"PROCESSING SUMMARY")
    print(f"{'='*60}")
    print(f"✅ Successfully processed: {len(all_results)}/{len(pdf_files)}")
    if failed_files:
        print(f"❌ Failed files:")
        for filename, reason in failed_files:
            print(f"   - {filename}: {reason}")
    print(f"{'='*60}")

def validate_extracted_data(data):
    """Validate that extracted data has minimum required fields."""
    if not data or "period" not in data:
        return False
    
    # Check if we have at least one financial metric
    schema_metrics = [m['metric_name'] for m in METRICS_SCHEMA]
    has_metrics = any(metric in data for metric in schema_metrics)
    
    if not has_metrics:
        return False
    
    # Check for reasonable values (not all zeros for key metrics)
    key_metrics = ['revenue_total', 'net_income', 'total_assets']
    has_non_zero = False
    for metric in key_metrics:
        if metric in data and data[metric] != 0:
            has_non_zero = True
            break
    
    return has_non_zero

def save_to_csv(results):
    if not results: return
    schema_cols = [m['metric_name'] for m in METRICS_SCHEMA]
    
    # REMOVED "source_file" from this list
    columns = ["period"] + schema_cols 
    
    df = pd.DataFrame(results)
    
    # 1. Fill Missing with 0
    for col in columns:
        if col not in df.columns: df[col] = 0.0
        
    # 2. PYTHON MATH REPAIR
    df['gross_profit'] = df.apply(
        lambda row: row['revenue_total'] - row['cost_of_revenue'] if row['gross_profit'] == 0 else row['gross_profit'], axis=1
    )
    
    df['operating_expenses_total'] = df.apply(
        lambda row: (row['employee_costs'] + row['selling_marketing_expense'] + row['general_admin_expense']) 
        if row['operating_expenses_total'] == 0 else row['operating_expenses_total'], axis=1
    )
    
    df = df[columns]
    try: df = df.sort_values(by="period")
    except: pass
    
    # Ensure Output Folder Exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    # SAVE AS CSV
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"   💾 CSV Updated with Math Repair at {OUTPUT_FILE}")

if __name__ == "__main__":
    asyncio.run(main())