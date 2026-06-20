"""
Scenario Comparison Module
===========================
Runs multiple Monte Carlo simulations under different parameter scenarios
and returns side-by-side comparison results + visualization.
"""

import os
import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from typing import Dict, List, Optional
from monte_carlo_simulations import (
    load_financials,
    derive_historical_metrics,
    build_distributions,
    run_monte_carlo_simulations,
    NUM_SIMULATIONS,
    CSV_PATH,
    OUTPUT_DIR
)


DEFAULT_OVERLAY_SCENARIO = {
    "name": "Base Case",
    "overrides": {}
}


def apply_overrides(base: dict, dists: dict, overrides: dict) -> tuple:
    """Clone base and dists, apply parameter overrides for a scenario."""
    base_scenario = base.copy()
    dists_scenario = {k: v.copy() for k, v in dists.items()}

    for key, value in overrides.items():
        if key in base_scenario:
            base_scenario[key] = value
        dist_key = None
        for dk in dists_scenario:
            if key.startswith(dk) or dk.startswith(key):
                dist_key = dk
                break
        if dist_key and key in dists_scenario[dist_key]:
            dists_scenario[dist_key][key] = value
        elif dist_key and key == dist_key:
            dists_scenario[dist_key] = value

    known_dists = {
        "revenue_growth": ["mean", "std", "min_val", "max_val"],
        "gross_margin": ["mean", "std", "min_val", "max_val"],
        "opex_ratio": ["mean", "std", "min_val", "max_val"],
        "cash_conversion": ["mean", "std", "min_val", "max_val"],
        "capex_ratio": ["mean", "std"],
    }

    for dist_name, fields in known_dists.items():
        for field in fields:
            override_key = f"{dist_name}_{field}"
            if override_key in overrides:
                dists_scenario[dist_name][field] = overrides[override_key]

    for key, value in overrides.items():
        for dist_name in known_dists:
            for field in known_dists[dist_name]:
                if key == f"{dist_name}_{field}":
                    dists_scenario[dist_name][field] = value

    return base_scenario, dists_scenario


def run_scenario(base: dict, dists: dict, overrides: dict, num_sims: int = None) -> dict:
    if overrides:
        base_sc, dists_sc = apply_overrides(base, dists, overrides)
    else:
        base_sc, dists_sc = base, dists
    sim_data = run_monte_carlo_simulations(base_sc, dists_sc, num_sims)
    return _summarize_scenario(base_sc, sim_data)


def _summarize_scenario(base: dict, sim_data: dict) -> dict:
    revenue = sim_data["revenue"]
    cash = sim_data["cash"]
    gross_margin = sim_data["gross_margin"]
    operating_margin = sim_data["operating_margin"]
    cash_flow = sim_data["cash_flow"]

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
        },
        "risk": {
            "revenue_risk": "HIGH" if revenue_cv > 0.25 else "MEDIUM" if revenue_cv > 0.15 else "LOW",
            "cash_risk": "HIGH" if prob_cash_negative > 0.15 else "MEDIUM" if prob_cash_negative > 0.05 else "LOW",
        }
    }


def run_scenario_comparison(scenarios: List[dict], num_sims: int = None) -> dict:
    df = load_financials(CSV_PATH)
    base = derive_historical_metrics(df)
    dists = build_distributions(base)

    if num_sims is None:
        num_sims = NUM_SIMULATIONS

    results = []
    for scenario in scenarios:
        name = scenario.get("name", "Unnamed")
        overrides = scenario.get("overrides", {})
        summary = run_scenario(base, dists, overrides, num_sims)
        results.append({
            "name": name,
            "overrides": overrides,
            **summary
        })

    plot_path = plot_comparison_chart(results, base)

    return {
        "num_simulations": num_sims,
        "historical_periods": len(df),
        "scenarios": results,
        "plot": plot_path,
    }


def plot_comparison_chart(scenario_results: List[dict], base: dict) -> str:
    names = [s["name"] for s in scenario_results]
    n = len(names)
    x = np.arange(n)
    width = 0.25

    fig, axes = plt.subplots(1, 3, figsize=(6 * n + 2, 6))
    colors = ["#8c52ff", "#ff6b6b", "#4ecdc4", "#ffd93d", "#6c5ce7"]

    for idx, (metric_key, title, ylabel, getter) in enumerate([
        ("revenue", "Revenue Comparison", "Revenue", lambda s: (
            s["revenue"]["median"], s["revenue"]["p10"], s["revenue"]["p90"]
        )),
        ("cash", "Cash Comparison", "Cash", lambda s: (
            s["cash"]["median"], s["cash"]["p5"], s["cash"]["p95"]
        )),
        ("risk", "Risk Probability Comparison", "Probability", lambda s: (
            s["revenue"]["prob_decline"],
            s["cash"]["prob_negative"],
        )),
    ]):
        ax = axes[idx]
        if metric_key == "risk":
            rev_decline = [getter(s)[0] for s in scenario_results]
            cash_neg = [getter(s)[1] for s in scenario_results]
            ax.bar(x - width / 2, rev_decline, width, color=colors[0], alpha=0.8, label="Rev Decline")
            ax.bar(x + width / 2, cash_neg, width, color=colors[1], alpha=0.8, label="Cash Negative")
            ax.axhline(0.15, color="red", linestyle="--", linewidth=1.5, alpha=0.6, label="High Risk Threshold")
            ax.set_ylabel("Probability")
            ax.legend(fontsize=9)
        else:
            medians = [getter(s)[0] for s in scenario_results]
            lowers = [getter(s)[1] for s in scenario_results]
            uppers = [getter(s)[2] for s in scenario_results]

            bars = ax.bar(x, medians, width, color=colors[:n], alpha=0.8, edgecolor="white", linewidth=1.5)
            ax.errorbar(x, medians, yerr=[
                [m - l for m, l in zip(medians, lowers)],
                [u - m for u, m in zip(uppers, medians)]
            ], fmt="none", capsize=6, capthick=2, color="black", alpha=0.6)

            for bar, val in zip(bars, medians):
                ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(),
                        f"{val:,.0f}", ha="center", va="bottom", fontsize=9, fontweight="bold")

            ax.set_ylabel(ylabel)

        ax.set_xticks(x)
        ax.set_xticklabels(names, fontsize=11, fontweight="bold")
        ax.set_title(title, fontsize=13, fontweight="bold", pad=15)
        ax.grid(True, alpha=0.2, axis="y", linestyle="--", linewidth=0.5)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)

    starting_rev = base["revenue"]
    starting_cash = base["cash"]
    fig.suptitle(f"Scenario Comparison (Starting Revenue: {starting_rev:,.0f}, Cash: {starting_cash:,.0f})",
                 fontsize=14, fontweight="bold", y=1.02)

    plt.tight_layout()
    filename = os.path.join(OUTPUT_DIR, "scenario_comparison.png")
    plt.savefig(filename, dpi=300, bbox_inches="tight")
    print(f"Scenario comparison chart saved to '{filename}'")
    plt.close()
    return filename


def run_comparison_cli(scenarios_json: str) -> str:
    scenarios = json.loads(scenarios_json)
    result = run_scenario_comparison(scenarios)
    return json.dumps(result, indent=2, default=str)
