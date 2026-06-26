"""
Multi-company Benchmarking Module
==================================
Compares financial metrics across multiple companies side by side.
Generates comparison tables, radar charts, and grouped bar charts.
"""

import os
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from typing import Dict, List, Optional
from monte_carlo_simulations import (
    load_financials,
    derive_historical_metrics,
    CSV_PATH,
    OUTPUT_DIR,
)
from ratio_dashboard import compute_ratios


BENCHMARK_METRICS = [
    ("revenue_total", "Revenue", "currency"),
    ("gross_profit", "Gross Profit", "currency"),
    ("net_income", "Net Income", "currency"),
    ("cash_end_period", "Cash", "currency"),
    ("total_assets", "Total Assets", "currency"),
    ("total_liabilities", "Total Liabilities", "currency"),
    ("shareholders_equity", "Equity", "currency"),
    ("employee_count", "Employees", "count"),
]

DERIVED_BENCHMARK_METRICS = [
    ("gross_margin_pct", "Gross Margin %", "pct"),
    ("operating_margin_pct", "Operating Margin %", "pct"),
    ("debt_to_equity", "D/E Ratio", "ratio"),
    ("current_ratio", "Current Ratio", "ratio"),
]


def extract_company_metrics(company_label: str, csv_path: str) -> Dict:
    df = load_financials(csv_path)
    if df.empty:
        return {"label": company_label, "error": "No data found"}

    base = derive_historical_metrics(df)

    metrics = {}
    for col, label, unit in BENCHMARK_METRICS:
        if col in df.columns and col in base:
            metrics[col] = {
                "label": label,
                "value": base[col] if isinstance(base[col], (int, float)) else None,
                "unit": unit,
            }
        elif col in df.columns:
            vals = df[col].dropna()
            metrics[col] = {
                "label": label,
                "value": float(vals.iloc[-1]) if len(vals) > 0 else None,
                "unit": unit,
            }
        else:
            metrics[col] = {"label": label, "value": None, "unit": unit}

    for name, label, unit in DERIVED_BENCHMARK_METRICS:
        if name == "gross_margin_pct":
            rev = metrics.get("revenue_total", {}).get("value")
            gp = metrics.get("gross_profit", {}).get("value")
            val = (gp / rev * 100) if rev and gp and rev != 0 else None
        elif name == "operating_margin_pct":
            rev = metrics.get("revenue_total", {}).get("value")
            ni = metrics.get("net_income", {}).get("value")
            val = (ni / rev * 100) if rev and ni and rev != 0 else None
        elif name == "debt_to_equity":
            ltd = base.get("long_term_debt", 0) or 0
            std = base.get("short_term_debt", 0) or 0
            eq = base.get("shareholders_equity", 1) or 1
            val = (ltd + std) / eq if eq != 0 else None
        elif name == "current_ratio":
            tca = base.get("total_current_assets", 0) or 0
            tl = base.get("total_liabilities", 1) or 1
            val = tca / tl if tl != 0 else None
        else:
            val = None
        metrics[name] = {"label": label, "value": val, "unit": unit}

    period_count = len(df)
    periods = df["period"].tolist() if "period" in df.columns else []

    return {
        "label": company_label,
        "metrics": metrics,
        "periods_analyzed": period_count,
        "periods": periods,
    }


def run_benchmarking(companies: List[Dict]) -> Dict:
    results = []
    for company in companies:
        label = company.get("label", "Unnamed")
        csv_path = company.get("csv_path")
        if not csv_path or not os.path.exists(csv_path):
            results.append({"label": label, "error": f"CSV not found: {csv_path}"})
            continue
        result = extract_company_metrics(label, csv_path)
        results.append(result)

    radar_path = plot_radar_chart(results)
    bar_path = plot_benchmark_bar_chart(results)

    summary_rows = []
    if results:
        all_metric_keys = set()
        for r in results:
            if "metrics" in r:
                all_metric_keys.update(r["metrics"].keys())
        for key in sorted(all_metric_keys):
            label = ""
            values = []
            for r in results:
                if "metrics" in r and key in r["metrics"]:
                    m = r["metrics"][key]
                    label = m.get("label", key)
                    values.append(m.get("value"))
            if not label:
                continue
            valid = [v for v in values if v is not None]
            summary_rows.append({
                "metric_key": key,
                "metric_label": label,
                "values": values,
                "best": max(valid) if valid else None,
                "worst": min(valid) if valid else None,
                "average": float(np.mean(valid)) if valid else None,
            })

    return {
        "companies": results,
        "summary": summary_rows,
        "charts": {
            "radar": radar_path,
            "bar": bar_path,
        },
    }


def plot_radar_chart(results: List[Dict]) -> Optional[str]:
    valid = [r for r in results if "metrics" in r and not r.get("error")]
    if len(valid) < 2:
        return None

    radar_metrics = ["gross_margin_pct", "operating_margin_pct", "debt_to_equity", "current_ratio"]
    metric_labels = []
    all_values = []
    for m in radar_metrics:
        vals = []
        for r in valid:
            if m in r.get("metrics", {}):
                v = r["metrics"][m].get("value")
                vals.append(v if v is not None else 0)
        if vals:
            metric_labels.append(r["metrics"][m]["label"])
            all_values.append(vals)

    if len(metric_labels) < 3:
        return None

    num_vars = len(metric_labels)
    angles = np.linspace(0, 2 * np.pi, num_vars, endpoint=False).tolist()
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))
    colors = ["#8c52ff", "#ff6b6b", "#4ecdc4", "#ffd93d", "#6c5ce7", "#f97316"]

    for idx, r in enumerate(valid):
        values = []
        for i in range(num_vars):
            v = all_values[i][idx]
            if all_values[i]:
                max_v = max(all_values[i])
                normalized = v / max_v if max_v > 0 else 0
                values.append(normalized)
            else:
                values.append(0)
        values += values[:1]
        color = colors[idx % len(colors)]
        ax.plot(angles, values, "o-", linewidth=2, label=r.get("label", f"Company {idx+1}"), color=color)
        ax.fill(angles, values, alpha=0.1, color=color)

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(metric_labels, fontsize=10, fontweight="bold")
    ax.set_ylim(0, 1.1)
    ax.set_title("Company Benchmark — Radar", fontsize=14, fontweight="bold", pad=20)
    ax.legend(loc="upper right", bbox_to_anchor=(1.3, 1.1), fontsize=10)

    plt.tight_layout()
    filename = os.path.join(OUTPUT_DIR, "benchmark_radar.png")
    plt.savefig(filename, dpi=300, bbox_inches="tight")
    plt.close()
    return filename


def plot_benchmark_bar_chart(results: List[Dict]) -> Optional[str]:
    valid = [r for r in results if "metrics" in r and not r.get("error")]
    if not valid:
        return None

    bar_metrics = ["revenue_total", "net_income", "cash_end_period", "total_assets"]
    labels = [r.get("label", f"C{idx+1}") for idx, r in enumerate(valid)]
    n = len(labels)
    x = np.arange(len(bar_metrics))
    width = 0.8 / n if n > 0 else 0.2

    fig, ax = plt.subplots(figsize=(10, 6))
    colors = ["#8c52ff", "#ff6b6b", "#4ecdc4", "#ffd93d", "#6c5ce7"]

    for idx, r in enumerate(valid):
        vals = []
        for m in bar_metrics:
            if m in r.get("metrics", {}):
                v = r["metrics"][m].get("value")
                vals.append(v if v is not None else 0)
            else:
                vals.append(0)
        offset = (idx - (n - 1) / 2) * width
        bars = ax.bar(x + offset, vals, width, label=labels[idx],
                      color=colors[idx % len(colors)], alpha=0.85, edgecolor="white", linewidth=1)
        for bar, val in zip(bars, vals):
            if val > 0:
                ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(),
                        f"{val:,.0f}", ha="center", va="bottom", fontsize=7, fontweight="bold", rotation=45)

    ax.set_xticks(x)
    metric_labels_formatted = []
    for m in bar_metrics:
        for r in valid:
            if m in r.get("metrics", {}):
                metric_labels_formatted.append(r["metrics"][m]["label"])
                break
        else:
            metric_labels_formatted.append(m)
    ax.set_xticklabels(metric_labels_formatted, fontsize=10, fontweight="bold")
    ax.set_title("Company Benchmark — Key Metrics", fontsize=14, fontweight="bold", pad=15)
    ax.legend(fontsize=10)
    ax.grid(True, alpha=0.2, axis="y", linestyle="--", linewidth=0.5)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    plt.tight_layout()
    filename = os.path.join(OUTPUT_DIR, "benchmark_bar.png")
    plt.savefig(filename, dpi=300, bbox_inches="tight")
    plt.close()
    return filename


def run_benchmarking_cli(companies_json: str) -> str:
    companies = json.loads(companies_json)
    result = run_benchmarking(companies)
    return json.dumps(result, indent=2, default=str)


if __name__ == "__main__":
    sample = [
        {"label": "Company A", "csv_path": CSV_PATH},
        {"label": "Company B", "csv_path": CSV_PATH},
    ]
    result = run_benchmarking(sample)
    print(json.dumps(result, indent=2, default=str))
