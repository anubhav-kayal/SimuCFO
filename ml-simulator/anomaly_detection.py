"""
Anomaly Detection Module
=========================
Flags unusual metric jumps across periods using statistical heuristics
(z-score, IQR). Provides per-metric anomaly scores with severity ratings.
"""

import os
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from monte_carlo_simulations import load_financials, CSV_PATH, OUTPUT_DIR

SENSITIVITY = 2.0
IQR_MULTIPLIER = 1.5
MIN_PERIODS = 3

METRIC_COLUMNS = [
    "revenue_total",
    "gross_profit",
    "operating_expenses_total",
    "net_income",
    "cash_from_operations",
    "capital_expenditure",
    "cash_end_period",
    "total_current_assets",
    "total_assets",
    "short_term_debt",
    "long_term_debt",
    "total_liabilities",
    "shareholders_equity",
]

DERIVED_METRICS = {
    "gross_margin_pct": lambda df: df["gross_profit"] / df["revenue_total"].replace(0, np.nan) * 100,
    "operating_margin_pct": lambda df: (df["net_income"] / df["revenue_total"].replace(0, np.nan)) * 100,
    "debt_to_equity": lambda df: (df["short_term_debt"] + df["long_term_debt"]) / df["shareholders_equity"].replace(0, np.nan),
    "cash_ratio": lambda df: df["cash_end_period"] / df["total_liabilities"].replace(0, np.nan),
}


def detect_anomalies_zscore(values: np.ndarray, metric_name: str, sensitivity: float = SENSITIVITY) -> List[Dict]:
    if len(values) < MIN_PERIODS:
        return []
    mean = np.nanmean(values)
    std = np.nanstd(values)
    if std == 0 or np.isnan(std):
        return []
    anomalies = []
    for i, val in enumerate(values):
        if np.isnan(val):
            continue
        z = abs(val - mean) / std
        if z > sensitivity:
            direction = "spike" if val > mean else "drop"
            severity = "critical" if z > 3.5 else "high" if z > 2.5 else "medium"
            anomalies.append({
                "period_index": int(i),
                "value": float(val),
                "mean": float(mean),
                "std": float(std),
                "z_score": float(z),
                "direction": direction,
                "severity": severity,
                "metric": metric_name,
                "deviation_pct": float((val - mean) / abs(mean) * 100) if mean != 0 else 0,
            })
    return anomalies


def detect_anomalies_iqr(values: np.ndarray, metric_name: str, multiplier: float = IQR_MULTIPLIER) -> List[Dict]:
    if len(values) < MIN_PERIODS:
        return []
    q1 = np.nanpercentile(values, 25)
    q3 = np.nanpercentile(values, 75)
    iqr = q3 - q1
    if iqr == 0 or np.isnan(iqr):
        return []
    lower = q1 - multiplier * iqr
    upper = q3 + multiplier * iqr
    anomalies = []
    for i, val in enumerate(values):
        if np.isnan(val):
            continue
        if val < lower or val > upper:
            direction = "spike" if val > upper else "drop"
            severity = "critical" if abs(val - np.nanmedian(values)) > 3 * iqr else "high" if multiplier <= 1.5 else "medium"
            anomalies.append({
                "period_index": int(i),
                "value": float(val),
                "q1": float(q1),
                "q3": float(q3),
                "iqr": float(iqr),
                "lower_fence": float(lower),
                "upper_fence": float(upper),
                "direction": direction,
                "severity": severity,
                "metric": metric_name,
                "method": "iqr",
            })
    return anomalies


def compute_trend_metrics(values: np.ndarray, metric_name: str) -> Dict:
    if len(values) < 2:
        return {"metric": metric_name, "trend": "insufficient_data", "change_pct": 0}
    changes = []
    for i in range(1, len(values)):
        prev = values[i - 1]
        curr = values[i]
        if prev != 0 and not np.isnan(prev) and not np.isnan(curr):
            changes.append((curr - prev) / abs(prev) * 100)
    if not changes:
        return {"metric": metric_name, "trend": "stable", "change_pct": 0}
    avg_change = float(np.mean(changes))
    max_change = float(max(changes, key=abs))
    volatility = float(np.std(changes))
    if abs(avg_change) < 5:
        trend = "stable"
    elif avg_change > 0:
        trend = "increasing"
    else:
        trend = "decreasing"
    return {
        "metric": metric_name,
        "trend": trend,
        "avg_change_pct": round(avg_change, 2),
        "max_change_pct": round(max_change, 2),
        "volatility": round(volatility, 2),
        "direction": "up" if avg_change > 0 else "down",
    }


def run_anomaly_detection(csv_path: str = None) -> Dict:
    path = csv_path or CSV_PATH
    if not os.path.exists(path):
        return {"error": f"CSV not found: {path}", "anomalies": [], "summary": {}}

    df = load_financials(path)
    if df.empty or len(df) < 2:
        return {"error": "Insufficient data for anomaly detection", "anomalies": [], "summary": {}}

    all_anomalies = []
    trends = []
    metric_summaries = {}

    for col in METRIC_COLUMNS:
        if col not in df.columns:
            continue
        values = df[col].dropna().values
        if len(values) < MIN_PERIODS:
            continue
        z_anomalies = detect_anomalies_zscore(values, col)
        iqr_anomalies = detect_anomalies_iqr(values, col)
        seen_indices = set()
        for a in z_anomalies + iqr_anomalies:
            key = (a["period_index"], a["metric"])
            if key not in seen_indices:
                seen_indices.add(key)
                all_anomalies.append(a)
        trend = compute_trend_metrics(values, col)
        trends.append(trend)
        period_values = {}
        for i, val in enumerate(values):
            if not np.isnan(val):
                period_values[f"period_{i}"] = float(val)
        metric_summaries[col] = {
            "mean": float(np.nanmean(values)),
            "std": float(np.nanstd(values)),
            "min": float(np.nanmin(values)),
            "max": float(np.nanmax(values)),
            "anomaly_count": len(z_anomalies) + len(iqr_anomalies),
            "trend": trend["trend"],
            "values": period_values,
        }

    for name, fn in DERIVED_METRICS.items():
        try:
            series = fn(df)
            values = series.dropna().values
            if len(values) < MIN_PERIODS:
                continue
            z_anomalies = detect_anomalies_zscore(values, name)
            for a in z_anomalies:
                all_anomalies.append(a)
            trend = compute_trend_metrics(values, name)
            trends.append(trend)
            period_values = {}
            for i, val in enumerate(values):
                if not np.isnan(val):
                    period_values[f"period_{i}"] = float(val)
            metric_summaries[name] = {
                "mean": float(np.nanmean(values)),
                "std": float(np.nanstd(values)),
                "min": float(np.nanmin(values)),
                "max": float(np.nanmax(values)),
                "anomaly_count": len(z_anomalies),
                "trend": trend["trend"],
                "values": period_values,
            }
        except Exception:
            pass

    all_anomalies.sort(key=lambda x: x["z_score"] if "z_score" in x else 0, reverse=True)

    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for a in all_anomalies:
        sev = a.get("severity", "medium")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    high_risk_metrics = [
        m for m, s in metric_summaries.items()
        if s.get("anomaly_count", 0) >= 2 or s.get("trend") in ("decreasing",)
    ]

    return {
        "anomalies": all_anomalies,
        "trends": trends,
        "metric_summaries": metric_summaries,
        "summary": {
            "total_anomalies": len(all_anomalies),
            "severity_breakdown": severity_counts,
            "high_risk_metrics": high_risk_metrics,
            "periods_analyzed": len(df),
            "metrics_analyzed": len(metric_summaries),
            "overall_risk": (
                "high" if severity_counts.get("critical", 0) > 0 or len(high_risk_metrics) > 3
                else "medium" if severity_counts.get("high", 0) > 0 or len(high_risk_metrics) > 1
                else "low"
            ),
        },
    }


if __name__ == "__main__":
    result = run_anomaly_detection()
    print(json.dumps(result, indent=2, default=str))
