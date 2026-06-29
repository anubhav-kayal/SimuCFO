import numpy as np
from typing import Dict

def generate_executive_summary(comprehensive_response: Dict) -> Dict:
    results = comprehensive_response.get("analysis_results", {})
    sim = comprehensive_response.get("monte_carlo_simulation", {})
    ratio = comprehensive_response.get("ratio_dashboard", {})
    anomaly = comprehensive_response.get("anomaly_detection", {})
    base = sim.get("base_metrics", {})
    computed = results.get("computed_answer", {})
    stats = comprehensive_response.get("raw_data", {})
    rev_stats = stats.get("revenue_statistics", {})
    cash_stats = stats.get("cash_statistics", {})

    rev_risk = computed.get("revenue_risk_assessment", {}).get("risk_level", "N/A")
    cash_risk = computed.get("cash_risk_assessment", {}).get("risk_level", "N/A")
    prob_neg = cash_stats.get("probability_negative", 0)
    rev_decline = rev_stats.get("probability_decline", 0)
    rev_cv = rev_stats.get("coefficient_of_variation", 0)
    rev_growth = computed.get("expected_revenue_range", {}).get("median", 0)

    starting_rev = base.get("starting_revenue", 0)
    starting_cash = base.get("starting_cash", 0)
    median_rev = rev_stats.get("median", 0)
    median_cash = cash_stats.get("median", 0)
    p5_cash = cash_stats.get("p5", 0)
    p95_cash = cash_stats.get("p95", 0)

    findings = []
    risks = []
    opportunities = []

    if rev_risk != "N/A":
        if rev_risk == "HIGH":
            findings.append(f"Revenue is highly volatile (CV: {rev_cv:.2f}) with a {rev_decline*100:.0f}% chance of decline.")
            risks.append("Revenue volatility may impact planning and valuation.")
        elif rev_risk == "MEDIUM":
            findings.append(f"Revenue shows moderate volatility (CV: {rev_cv:.2f}).")
        else:
            opportunities.append(f"Revenue is stable with low volatility (CV: {rev_cv:.2f}).")

    if prob_neg > 0.15:
        findings.append(f"Cash liquidity is a critical concern — {prob_neg*100:.0f}% probability of negative cash.")
        risks.append("High risk of cash shortfall; consider capital raise or cost reduction.")
    elif prob_neg > 0.05:
        findings.append(f"Cash position has moderate risk ({prob_neg*100:.0f}% probability negative).")
        risks.append("Monitor cash runway closely over the next 2-3 quarters.")
    else:
        opportunities.append(f"Cash position is strong with only {prob_neg*100:.0f}% probability of going negative.")

    rev_change = ((median_rev - starting_rev) / starting_rev * 100) if starting_rev > 0 else 0
    cash_change = ((median_cash - starting_cash) / starting_cash * 100) if starting_cash > 0 else 0

    if abs(rev_change) > 5:
        direction = "growth" if rev_change > 0 else "decline"
        findings.append(f"Median projected revenue {direction} of {abs(rev_change):.0f}% ({'$' + format_val(starting_rev)} → {'$' + format_val(median_rev)}).")

    if abs(cash_change) > 10:
        direction = "increase" if cash_change > 0 else "decline"
        findings.append(f"Median cash {direction} of {abs(cash_change):.0f}% ({'$' + format_val(starting_cash)} → {'$' + format_val(median_cash)}).")

    ratio_overall = ratio.get("overall_risk", "N/A") if ratio else "N/A"
    if ratio_overall == "high":
        findings.append(f"Overall financial health is weak (Ratio Dashboard: {ratio_overall.upper()} risk).")
        risks.append("Multiple balance sheet ratios indicate financial stress.")
    elif ratio_overall == "medium":
        findings.append("Financial health metrics show mixed signals across categories.")
    elif ratio_overall == "low":
        opportunities.append("Overall financial health is sound across all ratio categories.")

    if anomaly and anomaly.get("summary", {}).get("total_anomalies", 0) > 0:
        n = anomaly["summary"]["total_anomalies"]
        severity = anomaly["summary"].get("overall_risk", "low")
        if severity == "high":
            risks.append(f"{n} data anomalies detected — review input data quality.")
            findings.append(f"{n} anomalous data points flagged across historical periods.")
        else:
            findings.append(f"{n} minor data anomalies detected; no immediate concern.")

    if not findings:
        findings.append("Analysis completed. Financial metrics are within expected ranges.")

    summary_text = "## Executive Summary\n\n"
    if findings:
        summary_text += "### Key Findings\n"
        for f in findings:
            summary_text += f"- {f}\n"
        summary_text += "\n"
    if risks:
        summary_text += "### Risks & Concerns\n"
        for r in risks:
            summary_text += f"- ⚠ {r}\n"
        summary_text += "\n"
    if opportunities:
        summary_text += "### Opportunities\n"
        for o in opportunities:
            summary_text += f"- ✓ {o}\n"

    return {
        "summary_text": summary_text,
        "key_findings": findings,
        "risks": risks,
        "opportunities": opportunities,
        "revenue_outlook": "positive" if rev_change > 5 else "caution" if rev_change > -5 else "negative",
        "cash_outlook": "strong" if prob_neg < 0.05 else "moderate" if prob_neg < 0.15 else "critical",
        "overall_health": ratio_overall,
    }


def format_val(v):
    if v >= 1e9:
        return f"{v/1e9:.2f}B"
    if v >= 1e6:
        return f"{v/1e6:.2f}M"
    if v >= 1e3:
        return f"{v/1e3:.2f}K"
    return f"{v:.0f}"
