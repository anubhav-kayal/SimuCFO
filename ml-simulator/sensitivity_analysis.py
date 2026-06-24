"""
Sensitivity Analysis Module (Tornado Charts)
==============================================
Perturbs key input parameters and measures impact on output metrics
to identify which drivers have the largest effect on financial outcomes.
"""

import os
import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from typing import Dict, List, Optional, Tuple
from monte_carlo_simulations import (
    load_financials,
    derive_historical_metrics,
    build_distributions,
    run_monte_carlo_simulations,
    NUM_SIMULATIONS,
    CSV_PATH,
    OUTPUT_DIR
)

PERTURBATION_PCT = 0.10

INPUT_PARAMETERS = [
    "revenue_growth_mean",
    "gross_margin_mean",
    "opex_ratio_mean",
    "cash_conversion_mean",
    "capex_ratio_mean",
]

def _param_label(key: str) -> str:
    labels = {
        "revenue_growth_mean": "Revenue Growth",
        "gross_margin_mean": "Gross Margin",
        "opex_ratio_mean": "Opex Ratio",
        "cash_conversion_mean": "Cash Conversion",
        "capex_ratio_mean": "CapEx Ratio",
    }
    return labels.get(key, key.replace("_", " ").title())


def run_sensitivity(base: dict, dists: dict, num_sims: int = None) -> Dict:
    if num_sims is None:
        num_sims = min(NUM_SIMULATIONS, 5000)

    baseline = run_monte_carlo_simulations(base, dists, num_sims)
    baseline_summary = _summarize(baseline, base)

    perturbations = []
    for param in INPUT_PARAMETERS:
        dist_key = param.replace("_mean", "")
        if dist_key not in dists:
            continue
        orig_mean = dists[dist_key].get("mean", 0)
        if orig_mean == 0:
            continue

        delta = abs(orig_mean * PERTURBATION_PCT)

        for direction, label_suffix in [(1, "High"), (-1, "Low")]:
            dists_pert = {k: v.copy() for k, v in dists.items()}
            dists_pert[dist_key] = {**dists_pert[dist_key], "mean": orig_mean + delta * direction}
            sim = run_monte_carlo_simulations(base, dists_pert, num_sims)
            summary = _summarize(sim, base)
            perturbations.append({
                "parameter": param,
                "label": f"{_param_label(param)} ({label_suffix})",
                "direction": label_suffix.lower(),
                "summary": summary,
            })

    metrics = ["median_cash", "median_revenue", "prob_cash_negative", "median_operating_margin"]
    tornado_data = {}
    for metric in metrics:
        baseline_val = baseline_summary.get(metric)
        if baseline_val is None or baseline_val == 0:
            continue
        impacts = []
        for p in perturbations:
            p_val = p["summary"].get(metric)
            if p_val is None:
                continue
            impact = p_val - baseline_val
            if metric == "prob_cash_negative":
                impact_pct = impact * 100
            elif metric in ("median_operating_margin",):
                impact_pct = impact
            else:
                impact_pct = (impact / abs(baseline_val)) * 100 if abs(baseline_val) > 0 else 0
            impacts.append({
                "parameter": p["parameter"],
                "direction": p["direction"],
                "value": float(p_val),
                "impact": float(impact),
                "impact_pct": float(impact_pct),
            })
        grouped = {}
        for imp in impacts:
            param = imp["parameter"]
            if param not in grouped:
                grouped[param] = {"label": _param_label(param), "high": None, "low": None}
            if imp["direction"] == "high":
                grouped[param]["high"] = imp
            else:
                grouped[param]["low"] = imp
        sorted_items = sorted(
            grouped.items(),
            key=lambda x: abs((x[1]["high"]["impact_pct"] if x[1]["high"] else 0) -
                              (x[1]["low"]["impact_pct"] if x[1]["low"] else 0)),
            reverse=True,
        )
        tornado_data[metric] = {
            "baseline": float(baseline_val),
            "parameters": [
                {
                    "param": p,
                    "label": info["label"],
                    "high": info["high"],
                    "low": info["low"],
                    "range": float(abs(
                        (info["high"]["impact_pct"] if info["high"] else 0) -
                        (info["low"]["impact_pct"] if info["low"] else 0)
                    )),
                }
                for p, info in sorted_items
            ],
        }

    return {
        "num_simulations": num_sims,
        "perturbation_pct": PERTURBATION_PCT,
        "baseline": baseline_summary,
        "tornado": tornado_data,
    }


def _summarize(sim_data: dict, base: dict) -> dict:
    cash = sim_data["cash"]
    revenue = sim_data["revenue"]
    gross_margin = sim_data["gross_margin"]
    operating_margin = sim_data["operating_margin"]
    cash_flow = sim_data["cash_flow"]
    return {
        "median_cash": float(np.median(cash)),
        "p5_cash": float(np.percentile(cash, 5)),
        "p95_cash": float(np.percentile(cash, 95)),
        "median_revenue": float(np.median(revenue)),
        "p10_revenue": float(np.percentile(revenue, 10)),
        "p90_revenue": float(np.percentile(revenue, 90)),
        "median_gross_margin": float(np.median(gross_margin)),
        "median_operating_margin": float(np.median(operating_margin)),
        "prob_cash_negative": float(np.mean(cash < 0)),
        "prob_revenue_decline": float(np.mean(revenue < base["revenue"])),
    }


def plot_tornado(sensitivity_result: dict, metric: str = "median_cash") -> str:
    tornado_info = sensitivity_result.get("tornado", {}).get(metric)
    if not tornado_info or not tornado_info.get("parameters"):
        return None

    baseline = tornado_info["baseline"]
    params = tornado_info["parameters"]
    metric_label = metric.replace("_", " ").replace("median ", "").title()

    fig, ax = plt.subplots(figsize=(12, 7))
    y_pos = np.arange(len(params))
    bar_height = 0.6

    low_vals = []
    high_vals = []
    labels = []
    for p in params:
        low = p["low"]["impact_pct"] if p["low"] else 0
        high = p["high"]["impact_pct"] if p["high"] else 0
        low_vals.append(low)
        high_vals.append(high)
        labels.append(p["label"])

    for i, (low, high, label) in enumerate(zip(low_vals, high_vals, labels)):
        left = min(low, high)
        width = abs(high - low)
        color = "#8c52ff" if width == max(abs(h - l) for h, l in zip(high_vals, low_vals)) else "#b899ff"
        ax.barh(i, width, left=left, height=bar_height, color=color, edgecolor="white", linewidth=1.5, alpha=0.85)
        mid = (low + high) / 2
        ax.text(mid, i, f"  {label}", va="center", ha="center", fontsize=10, fontweight="bold", color="white")

    ax.axvline(0, color="black", linewidth=1.5, linestyle="-")
    ax.set_yticks(y_pos)
    ax.set_yticklabels([""] * len(params))
    ax.set_xlabel(f"Impact on {metric_label} (% change from baseline)", fontsize=12, fontweight="bold")
    ax.set_title(f"Sensitivity Analysis: Impact on {metric_label}\nBaseline: {baseline:,.0f}" if "prob" not in metric
                 else f"Sensitivity Analysis: Impact on {metric_label}\nBaseline: {baseline*100:.1f}%",
                 fontsize=14, fontweight="bold", pad=15)
    ax.grid(True, alpha=0.2, axis="x", linestyle="--", linewidth=0.5)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_visible(False)
    ax.invert_yaxis()

    for i, (low, high, label) in enumerate(zip(low_vals, high_vals, labels)):
        ax.text(low - 0.5, i, f"{low:+.1f}%", va="center", ha="right", fontsize=9, fontweight="bold", color="#d32f2f")
        ax.text(high + 0.5, i, f"{high:+.1f}%", va="center", ha="left", fontsize=9, fontweight="bold", color="#2e7d32")

    fig.legend(["Low → High Impact"], loc="lower right", fontsize=9, framealpha=0.9)
    plt.tight_layout()
    filename = os.path.join(OUTPUT_DIR, f"tornado_{metric}.png")
    plt.savefig(filename, dpi=300, bbox_inches="tight")
    print(f"Tornado chart saved to '{filename}'")
    plt.close()
    return filename


def plot_tornado_absolute(sensitivity_result: dict, metric: str = "median_cash") -> str:
    tornado_info = sensitivity_result.get("tornado", {}).get(metric)
    if not tornado_info or not tornado_info.get("parameters"):
        return None

    baseline = tornado_info["baseline"]
    params = tornado_info["parameters"]
    metric_label = metric.replace("_", " ").replace("median ", "").title()

    fig, ax = plt.subplots(figsize=(12, 7))
    y_pos = np.arange(len(params))
    bar_height = 0.6

    low_vals = []
    high_vals = []
    labels = []
    for p in params:
        low = p["low"]["value"] if p["low"] else baseline
        high = p["high"]["value"] if p["high"] else baseline
        low_vals.append(low)
        high_vals.append(high)
        labels.append(p["label"])

    for i, (low, high, label) in enumerate(zip(low_vals, high_vals, labels)):
        left = min(low, high)
        width = abs(high - low)
        color = "#8c52ff"
        ax.barh(i, width, left=left, height=bar_height, color=color, edgecolor="white", linewidth=1.5, alpha=0.8)
        ax.text((low + high) / 2, i, f"  {label}", va="center", ha="center", fontsize=10, fontweight="bold", color="white")

    ax.axvline(baseline, color="red", linewidth=2, linestyle="--", label=f"Baseline: {baseline:,.0f}" if "prob" not in metric else f"Baseline: {baseline*100:.1f}%")
    ax.set_yticks(y_pos)
    ax.set_yticklabels([""] * len(params))
    ax.set_xlabel(metric_label, fontsize=12, fontweight="bold")
    ax.set_title(f"Sensitivity Analysis: {metric_label}\nImpact of ±{sensitivity_result['perturbation_pct']*100:.0f}% Parameter Changes",
                 fontsize=14, fontweight="bold", pad=15)
    ax.grid(True, alpha=0.2, axis="x", linestyle="--", linewidth=0.5)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_visible(False)
    ax.invert_yaxis()
    ax.legend(loc="lower right", fontsize=9, framealpha=0.9)

    for i, (low, high) in enumerate(zip(low_vals, high_vals)):
        fmt = ".1f" if "prob" in metric else ",.0f"
        ax.text(low, i, f"  {low:{fmt}}", va="center", ha="left", fontsize=8, fontweight="bold", color="#333")
        ax.text(high, i, f"  {high:{fmt}}", va="center", ha="left", fontsize=8, fontweight="bold", color="#333")

    plt.tight_layout()
    filename = os.path.join(OUTPUT_DIR, f"tornado_absolute_{metric}.png")
    plt.savefig(filename, dpi=300, bbox_inches="tight")
    print(f"Tornado chart (absolute) saved to '{filename}'")
    plt.close()
    return filename
