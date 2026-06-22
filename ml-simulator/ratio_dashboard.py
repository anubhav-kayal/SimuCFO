"""
Ratio Dashboard Module
======================
Computes comprehensive financial ratios from extracted data and Monte Carlo simulations.
Categories: Profitability, Liquidity, Solvency, Efficiency.
"""

import numpy as np
from typing import Dict, Optional


# ── Health score thresholds (standard financial norms) ──────────────────
RATIO_THRESHOLDS = {
    # Profitability
    "net_profit_margin":        {"good": 0.10, "warn": 0.05, "unit": "%", "higher_is_better": True},
    "gross_margin":             {"good": 0.40, "warn": 0.20, "unit": "%", "higher_is_better": True},
    "operating_margin":         {"good": 0.15, "warn": 0.05, "unit": "%", "higher_is_better": True},
    "return_on_equity":         {"good": 0.15, "warn": 0.05, "unit": "%", "higher_is_better": True},
    "return_on_assets":         {"good": 0.05, "warn": 0.02, "unit": "%", "higher_is_better": True},
    # Liquidity
    "current_ratio":            {"good": 2.0,  "warn": 1.0,  "unit": "x",  "higher_is_better": True},
    "quick_ratio":              {"good": 1.0,  "warn": 0.5,  "unit": "x",  "higher_is_better": True},
    "cash_ratio":               {"good": 0.3,  "warn": 0.1,  "unit": "x",  "higher_is_better": True},
    # Solvency
    "debt_to_equity":           {"good": 0.5,  "warn": 1.5,  "unit": "x",  "higher_is_better": False},
    "debt_ratio":               {"good": 0.3,  "warn": 0.6,  "unit": "x",  "higher_is_better": False},
    "interest_coverage_ratio":  {"good": 3.0,  "warn": 1.5,  "unit": "x",  "higher_is_better": True},
    # Efficiency
    "asset_turnover":           {"good": 1.0,  "warn": 0.5,  "unit": "x",  "higher_is_better": True},
    "cash_conversion_cycle":    {"good": 30,   "warn": 60,   "unit": "days", "higher_is_better": False},
}


def compute_health_score(value: Optional[float], thresholds: dict) -> int:
    if value is None:
        return 0
    good = thresholds["good"]
    warn = thresholds["warn"]
    higher_better = thresholds["higher_is_better"]
    if higher_better:
        if value >= good:
            return 100
        elif value >= warn:
            return int(50 + (value - warn) / (good - warn) * 50) if (good - warn) > 0 else 50
        else:
            return int(max(0, min(50, (value / warn) * 50)))
    else:
        if value <= good:
            return 100
        elif value <= warn:
            return int(50 + (warn - value) / (warn - good) * 50) if (warn - good) > 0 else 50
        else:
            return int(max(0, min(50, (warn / value) * 50)))


def risk_label(score: int) -> str:
    if score >= 80:
        return "low"
    elif score >= 50:
        return "medium"
    return "high"


def compute_ratios(base: dict, sim_data: dict, df) -> dict:
    latest = df.iloc[-1] if len(df) > 0 else None

    # ── Pull raw values ──────────────────────────────────────────────
    revenue = base.get("revenue", 0)
    cash = base.get("cash", 0)
    gross_profit = revenue * base.get("gross_margin_mean", 0)
    opex = revenue * base.get("opex_ratio_mean", 0)
    operating_income = gross_profit - opex
    net_income = operating_income * 0.75  # rough 25% tax

    ta = base.get("total_assets") or latest.get("total_assets") if latest is not None else 0
    tl = base.get("total_liabilities") or latest.get("total_liabilities") if latest is not None else 0
    se = base.get("shareholders_equity") or latest.get("shareholders_equity") if latest is not None else 1
    tca = base.get("total_current_assets") or latest.get("total_current_assets") if latest is not None else 0
    std = base.get("short_term_debt") or latest.get("short_term_debt") if latest is not None else 0
    ltd = base.get("long_term_debt") or latest.get("long_term_debt") if latest is not None else 0
    interest_exp = latest.get("interest_expense") if latest is not None else None
    cogs = revenue * (1 - base.get("gross_margin_mean", 0.4))
    inventory = latest.get("inventory") if latest is not None else None

    td = (std or 0) + (ltd or 0)

    # ── Compute current (historical) ratios ──────────────────────────
    def safe_div(a, b):
        return a / b if b and b != 0 else None

    ratios = {}

    # Profitability
    ratios["net_profit_margin"] = safe_div(net_income, revenue)
    ratios["gross_margin"] = base.get("gross_margin_mean")
    ratios["operating_margin"] = safe_div(operating_income, revenue)
    ratios["return_on_equity"] = base.get("roe") or safe_div(net_income, se)
    ratios["return_on_assets"] = base.get("roa") or safe_div(net_income, ta)

    # Liquidity
    ratios["current_ratio"] = base.get("current_ratio") or safe_div(tca, tl)
    quick_assets = tca - (inventory or 0)
    ratios["quick_ratio"] = safe_div(quick_assets, tl) if tl else None
    ratios["cash_ratio"] = safe_div(cash, tl) if tl else None

    # Solvency
    ratios["debt_to_equity"] = base.get("debt_to_equity") or safe_div(td, se)
    ratios["debt_ratio"] = safe_div(td, ta) if ta else None
    ratios["interest_coverage_ratio"] = safe_div(operating_income, interest_exp) if interest_exp else None

    # Efficiency
    ratios["asset_turnover"] = safe_div(revenue, ta) if ta else None
    ratios["cash_conversion_cycle"] = None  # requires AR/AP days — not in schema

    # ── Simulated distributions (from MC) ────────────────────────────
    sim_current_ratio = sim_data.get("current_ratio", np.array([]))
    sim_debt_to_equity = sim_data.get("debt_to_equity", np.array([]))
    sim_roe = sim_data.get("roe", np.array([]))
    sim_roa = sim_data.get("roa", np.array([]))
    sim_gross_margin = sim_data.get("gross_margin", np.array([]))
    sim_operating_margin = sim_data.get("operating_margin", np.array([]))

    def sim_stats(arr):
        if len(arr) == 0:
            return None
        return {
            "p5": float(np.percentile(arr, 5)),
            "p25": float(np.percentile(arr, 25)),
            "median": float(np.median(arr)),
            "p75": float(np.percentile(arr, 75)),
            "p95": float(np.percentile(arr, 95)),
            "mean": float(np.mean(arr)),
            "std": float(np.std(arr)),
        }

    sim_distributions = {
        "current_ratio": sim_stats(sim_current_ratio),
        "debt_to_equity": sim_stats(sim_debt_to_equity),
        "return_on_equity": sim_stats(sim_roe),
        "return_on_assets": sim_stats(sim_roa),
        "gross_margin": sim_stats(sim_gross_margin),
        "operating_margin": sim_stats(sim_operating_margin),
    }

    # ── Build output ─────────────────────────────────────────────────
    categories = {
        "Profitability": ["net_profit_margin", "gross_margin", "operating_margin", "return_on_equity", "return_on_assets"],
        "Liquidity":     ["current_ratio", "quick_ratio", "cash_ratio"],
        "Solvency":      ["debt_to_equity", "debt_ratio", "interest_coverage_ratio"],
        "Efficiency":    ["asset_turnover", "cash_conversion_cycle"],
    }

    ratio_cards = {}
    for cat_name, metric_names in categories.items():
        for name in metric_names:
            val = ratios.get(name)
            thresh = RATIO_THRESHOLDS.get(name)
            if thresh is None:
                continue
            score = compute_health_score(val, thresh) if val is not None else 0
            risk = risk_label(score)
            dist = sim_distributions.get(name) if name in ("current_ratio", "debt_to_equity",
                      "return_on_equity", "return_on_assets", "gross_margin", "operating_margin") else None
            ratio_cards[name] = {
                "value": round(val, 4) if val is not None else None,
                "display_value": f"{round(val * 100, 1)}%" if thresh and thresh["unit"] == "%" and val is not None
                                else (round(val, 2) if val is not None else "—"),
                "unit": thresh["unit"],
                "health_score": score,
                "risk": risk,
                "category": cat_name,
                "label": name.replace("_", " ").title(),
                "simulated": dist,
            }

    overall_score = int(np.mean([c["health_score"] for c in ratio_cards.values()])) if ratio_cards else 0

    return {
        "overall_health_score": overall_score,
        "overall_risk": risk_label(overall_score),
        "categories": {
            cat: {
                "label": cat,
                "score": int(np.mean([ratio_cards[m]["health_score"] for m in metrics if m in ratio_cards])) if metrics else 0,
                "risk": risk_label(int(np.mean([ratio_cards[m]["health_score"] for m in metrics if m in ratio_cards]))) if metrics else "unknown",
            }
            for cat, metrics in categories.items()
        },
        "ratios": ratio_cards,
    }
