import pandas as pd
import numpy as np
from typing import Dict, List
from monte_carlo_simulations import CSV_PATH, safe_float

REQUIRED_METRICS = [
    "revenue_total", "gross_profit", "operating_expenses_total", "net_income",
    "cash_from_operations", "cash_end_period",
    "total_current_assets", "total_assets", "total_liabilities", "shareholders_equity",
]

CROSS_FIELD_CHECKS = [
    {"name": "assets_vs_liabilities_equity", "desc": "Assets ≈ Liabilities + Equity",
     "cols": ["total_assets", "total_liabilities", "shareholders_equity"]},
    {"name": "revenue_vs_gross_profit", "desc": "Gross Profit ≤ Revenue",
     "cols": ["revenue_total", "gross_profit"]},
    {"name": "opex_vs_revenue", "desc": "Opex ≤ Revenue (reasonable)",
     "cols": ["revenue_total", "operating_expenses_total"]},
]


def run_data_validation(csv_path: str = None) -> Dict:
    if csv_path is None:
        csv_path = CSV_PATH
    try:
        df = pd.read_csv(csv_path)
    except (FileNotFoundError, pd.errors.EmptyDataError):
        return {"status": "error", "message": "CSV file not found or empty"}

    if df.empty:
        return {"status": "error", "message": "No data in CSV"}

    issues = []
    metric_coverage = {}
    total_metrics = len(REQUIRED_METRICS)
    present_metrics = 0

    for col in REQUIRED_METRICS:
        if col not in df.columns:
            issues.append({"type": "missing_column", "metric": col, "severity": "high",
                           "message": f"Required metric '{col}' not found in extracted data"})
            metric_coverage[col] = {"present": False, "missing_pct": 100}
            continue

        null_count = df[col].isna().sum()
        null_pct = (null_count / len(df)) * 100
        present = df[col].apply(safe_float).notna().sum() > 0
        if present:
            present_metrics += 1

        metric_coverage[col] = {"present": present, "missing_pct": round(null_pct, 1)}

        if null_pct == 100:
            issues.append({"type": "all_null", "metric": col, "severity": "high",
                           "message": f"Metric '{col}' has no valid values across all periods"})
        elif null_pct > 50:
            issues.append({"type": "mostly_null", "metric": col, "severity": "medium",
                           "message": f"Metric '{col}' is missing in {null_pct:.0f}% of periods"})

    for check in CROSS_FIELD_CHECKS:
        cols = check["cols"]
        if any(c not in df.columns for c in cols):
            continue
        valid = df.dropna(subset=cols)
        if valid.empty:
            continue
        if check["name"] == "assets_vs_liabilities_equity":
            diff = (valid["total_assets"] - (valid["total_liabilities"] + valid["shareholders_equity"])).abs()
            threshold = valid["total_assets"].abs() * 0.1
            violations = (diff > threshold).sum()
            if violations > 0:
                issues.append({"type": "cross_field_mismatch", "metric": check["name"], "severity": "medium",
                               "message": f"{check['desc']}: {violations} period(s) with >10% discrepancy"})
        elif check["name"] == "revenue_vs_gross_profit":
            violations = (valid["gross_profit"] > valid["revenue_total"]).sum()
            if violations > 0:
                issues.append({"type": "cross_field_invalid", "metric": check["name"], "severity": "high",
                               "message": f"{check['desc']}: {violations} period(s) where gross profit exceeds revenue"})
        elif check["name"] == "opex_vs_revenue":
            violations = (valid["operating_expenses_total"] > valid["revenue_total"] * 1.5).sum()
            if violations > 0:
                issues.append({"type": "cross_field_unusual", "metric": check["name"], "severity": "low",
                               "message": f"{check['desc']}: {violations} period(s) with unusually high opex ratio"})

    if "period" in df.columns:
        periods = df["period"].dropna().tolist()
        if len(periods) != len(set(periods)):
            issues.append({"type": "duplicate_periods", "severity": "high",
                           "message": f"Duplicate period entries found: {len(periods) - len(set(periods))} duplicates"})
        if "Unknown" in str(periods):
            issues.append({"type": "unknown_periods", "severity": "low",
                           "message": "Some periods are labeled 'Unknown'"})

    num_periods = len(df)
    coverage_pct = round((present_metrics / total_metrics) * 100, 1) if total_metrics > 0 else 0
    overall_severity = "high" if any(i["severity"] == "high" for i in issues) else \
                      "medium" if any(i["severity"] == "medium" for i in issues) else \
                      "low" if issues else "pass"

    return {
        "status": "ok",
        "num_periods": num_periods,
        "metrics_found": present_metrics,
        "metrics_expected": total_metrics,
        "coverage_pct": coverage_pct,
        "overall_severity": overall_severity,
        "issues": issues,
        "metric_coverage": metric_coverage,
    }
