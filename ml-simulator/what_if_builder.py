import os
import json
import base64
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from typing import Dict, List, Optional
from monte_carlo_simulations import (
    derive_historical_metrics,
    build_distributions,
    run_monte_carlo_simulations,
    run_multi_period_simulations,
    plot_fan_chart,
    load_financials,
    CSV_PATH,
    OUTPUT_DIR,
    NUM_SIMULATIONS,
)


def apply_what_if_overrides(base: dict, dists: dict, overrides: dict) -> tuple:
    base_scenario = base.copy()
    dists_scenario = {k: v.copy() for k, v in dists.items()}

    param_map = {
        "revenue_growth_mean": ("revenue_growth", "mean"),
        "gross_margin_mean": ("gross_margin", "mean"),
        "opex_ratio_mean": ("opex_ratio", "mean"),
        "cash_conversion_mean": ("cash_conversion", "mean"),
        "capex_ratio_mean": ("capex_ratio", "mean"),
        "revenue_growth_std": ("revenue_growth", "std"),
        "gross_margin_std": ("gross_margin", "std"),
        "opex_ratio_std": ("opex_ratio", "std"),
        "cash_conversion_std": ("cash_conversion", "std"),
        "capex_ratio_std": ("capex_ratio", "std"),
    }

    for key, value in overrides.items():
        if key in base_scenario:
            base_scenario[key] = value
        if key in param_map:
            dist_name, dist_field = param_map[key]
            if dist_name in dists_scenario:
                dists_scenario[dist_name][dist_field] = value

    return base_scenario, dists_scenario


def run_what_if_projection(base: dict, dists: dict, overrides: dict, num_sims: int = None) -> dict:
    if overrides:
        base_sc, dists_sc = apply_what_if_overrides(base, dists, overrides)
    else:
        base_sc, dists_sc = base, dists

    sim_data = run_monte_carlo_simulations(base_sc, dists_sc, num_sims)
    return _summarize_what_if(base_sc, sim_data)


def _summarize_what_if(base: dict, sim_data: dict) -> dict:
    revenue = sim_data["revenue"]
    cash = sim_data["cash"]
    gross_margin = sim_data["gross_margin"]
    operating_margin = sim_data["operating_margin"]
    cash_flow = sim_data["cash_flow"]
    revenue_growth = sim_data["revenue_growth"]
    opex = sim_data["opex"]
    capex = sim_data["capex"]
    cfo = sim_data["cfo"]

    revenue_cv = float(np.std(revenue) / np.mean(revenue)) if np.mean(revenue) > 0 else 0
    cash_cv = float(np.std(cash) / np.abs(np.mean(cash))) if np.mean(cash) != 0 else 0
    prob_cash_negative = float(np.mean(cash < 0))
    prob_revenue_decline = float(np.mean(revenue < base["revenue"]))

    return {
        "base_metrics": {
            "starting_revenue": float(base["revenue"]),
            "starting_cash": float(base["cash"]),
        },
        "revenue": {
            "mean": float(np.mean(revenue)),
            "median": float(np.median(revenue)),
            "std": float(np.std(revenue)),
            "p5": float(np.percentile(revenue, 5)),
            "p10": float(np.percentile(revenue, 10)),
            "p90": float(np.percentile(revenue, 90)),
            "p95": float(np.percentile(revenue, 95)),
            "cv": revenue_cv,
            "prob_decline": prob_revenue_decline,
            "mean_growth": float(np.mean(revenue_growth)),
        },
        "cash": {
            "mean": float(np.mean(cash)),
            "median": float(np.median(cash)),
            "std": float(np.std(cash)),
            "p5": float(np.percentile(cash, 5)),
            "p10": float(np.percentile(cash, 10)),
            "p90": float(np.percentile(cash, 90)),
            "p95": float(np.percentile(cash, 95)),
            "cv": cash_cv,
            "prob_negative": prob_cash_negative,
        },
        "margins": {
            "gross_margin_median": float(np.median(gross_margin)),
            "operating_margin_median": float(np.median(operating_margin)),
            "gross_margin_mean": float(np.mean(gross_margin)),
            "operating_margin_mean": float(np.mean(operating_margin)),
        },
        "cash_flow": {
            "mean": float(np.mean(cash_flow)),
            "median": float(np.median(cash_flow)),
            "p5": float(np.percentile(cash_flow, 5)),
            "p95": float(np.percentile(cash_flow, 95)),
            "mean_opex": float(np.mean(opex)),
            "mean_capex": float(np.mean(capex)),
            "mean_cfo": float(np.mean(cfo)),
        },
        "risk": {
            "revenue_risk": "HIGH" if revenue_cv > 0.25 else "MEDIUM" if revenue_cv > 0.15 else "LOW",
            "cash_risk": "HIGH" if prob_cash_negative > 0.15 else "MEDIUM" if prob_cash_negative > 0.05 else "LOW",
            "prob_cash_negative": prob_cash_negative,
            "prob_revenue_decline": prob_revenue_decline,
        },
        "parameters_used": {
            "revenue_growth_mean": float(base.get("revenue_growth_mean", 0)),
            "gross_margin_mean": float(base.get("gross_margin_mean", 0)),
            "opex_ratio_mean": float(base.get("opex_ratio_mean", 0)),
            "cash_conversion_mean": float(base.get("cash_conversion_mean", 0)),
        },
    }


def run_what_if_comparison(base: dict, dists: dict, what_if_overrides: dict, base_label: str = "Base Case", what_if_label: str = "What-If", num_sims: int = None) -> dict:
    if num_sims is None:
        num_sims = min(NUM_SIMULATIONS, 5000)

    baseline_summary = run_what_if_projection(base, dists, {}, num_sims)
    what_if_summary = run_what_if_projection(base, dists, what_if_overrides, num_sims)

    plot_path = plot_what_if_comparison(baseline_summary, what_if_summary, base, base_label, what_if_label)

    plot_base64 = None
    if plot_path and os.path.exists(plot_path):
        with open(plot_path, "rb") as f:
            plot_base64 = base64.b64encode(f.read()).decode()

    return {
        "num_simulations": num_sims,
        "base": {"label": base_label, **baseline_summary},
        "what_if": {"label": what_if_label, **what_if_summary},
        "overrides_applied": what_if_overrides,
        "plot": plot_path,
        "plot_base64": plot_base64,
    }


def plot_what_if_comparison(baseline: dict, what_if: dict, base: dict, base_label: str = "Base", what_if_label: str = "What-If") -> str:
    fig, axes = plt.subplots(1, 3, figsize=(16, 6))
    colors = ["#4ecdc4", "#8c52ff"]

    # Revenue comparison
    ax = axes[0]
    labels = [base_label, what_if_label]
    rev_medians = [baseline["revenue"]["median"], what_if["revenue"]["median"]]
    rev_lowers = [baseline["revenue"]["p10"], what_if["revenue"]["p10"]]
    rev_uppers = [baseline["revenue"]["p90"], what_if["revenue"]["p90"]]
    x = np.arange(len(labels))
    bars = ax.bar(x, rev_medians, 0.4, color=colors, alpha=0.8, edgecolor="white", linewidth=1.5)
    ax.errorbar(x, rev_medians, yerr=[
        [m - l for m, l in zip(rev_medians, rev_lowers)],
        [u - m for u, m in zip(rev_uppers, rev_medians)]
    ], fmt="none", capsize=6, capthick=2, color="black", alpha=0.6)
    for bar, val in zip(bars, rev_medians):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(),
                f"{val:,.0f}", ha="center", va="bottom", fontsize=10, fontweight="bold")
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=11, fontweight="bold")
    ax.set_ylabel("Revenue", fontsize=12, fontweight="bold")
    ax.set_title("Revenue Comparison\n(P10–P90 bars)", fontsize=13, fontweight="bold", pad=10)
    ax.grid(True, alpha=0.2, axis="y", linestyle="--", linewidth=0.5)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    # Cash comparison
    ax = axes[1]
    cash_medians = [baseline["cash"]["median"], what_if["cash"]["median"]]
    cash_lowers = [baseline["cash"]["p5"], what_if["cash"]["p5"]]
    cash_uppers = [baseline["cash"]["p95"], what_if["cash"]["p95"]]
    bars = ax.bar(x, cash_medians, 0.4, color=colors, alpha=0.8, edgecolor="white", linewidth=1.5)
    ax.errorbar(x, cash_medians, yerr=[
        [m - l for m, l in zip(cash_medians, cash_lowers)],
        [u - m for u, m in zip(cash_uppers, cash_medians)]
    ], fmt="none", capsize=6, capthick=2, color="black", alpha=0.6)
    for bar, val in zip(bars, cash_medians):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(),
                f"{val:,.0f}", ha="center", va="bottom", fontsize=10, fontweight="bold")
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=11, fontweight="bold")
    ax.set_ylabel("Cash", fontsize=12, fontweight="bold")
    ax.set_title("Cash Comparison\n(P5–P95 bars)", fontsize=13, fontweight="bold", pad=10)
    ax.grid(True, alpha=0.2, axis="y", linestyle="--", linewidth=0.5)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    # Risk comparison
    ax = axes[2]
    rev_decline_probs = [baseline["risk"]["prob_revenue_decline"], what_if["risk"]["prob_revenue_decline"]]
    cash_neg_probs = [baseline["risk"]["prob_cash_negative"], what_if["risk"]["prob_cash_negative"]]
    x_risk = np.arange(len(labels))
    w = 0.3
    ax.bar(x_risk - w / 2, rev_decline_probs, w, color=colors[0], alpha=0.8, label="Rev Decline Prob.")
    ax.bar(x_risk + w / 2, cash_neg_probs, w, color=colors[1], alpha=0.8, label="Cash Negative Prob.")
    ax.axhline(0.15, color="red", linestyle="--", linewidth=1.5, alpha=0.6, label="High Risk Threshold")
    ax.set_xticks(x_risk)
    ax.set_xticklabels(labels, fontsize=11, fontweight="bold")
    ax.set_ylabel("Probability", fontsize=12, fontweight="bold")
    ax.set_title("Risk Probability Comparison", fontsize=13, fontweight="bold", pad=10)
    ax.legend(fontsize=9, loc="upper right")
    ax.grid(True, alpha=0.2, axis="y", linestyle="--", linewidth=0.5)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    starting_rev = base["revenue"]
    starting_cash = base["cash"]
    fig.suptitle(f"What-If Scenario Comparison (Starting Revenue: {starting_rev:,.0f}, Cash: {starting_cash:,.0f})",
                 fontsize=14, fontweight="bold", y=1.02)

    plt.tight_layout()
    filename = os.path.join(OUTPUT_DIR, "what_if_comparison.png")
    plt.savefig(filename, dpi=300, bbox_inches="tight")
    print(f"What-if comparison chart saved to '{filename}'")
    plt.close()
    return filename


def what_if_from_session(base_json: dict, overrides: dict, num_sims: int = None) -> dict:
    base = base_json.copy()
    dists = build_distributions(base)
    result = run_what_if_comparison(base, dists, overrides, "Base Case", "What-If", num_sims)
    return result
