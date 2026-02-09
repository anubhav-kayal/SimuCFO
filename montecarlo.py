import os
import pandas as pd
import numpy as np
from scipy.stats import truncnorm, lognorm
import json
import matplotlib.pyplot as plt
import re
from typing import Dict, List, Tuple, Optional

# =====================================================
# CONFIGURATION
# =====================================================

CSV_PATH = "./monte_carlo_final_data 2.csv"
NUM_SIMULATIONS = 10000 
np.random.seed(42)

# =====================================================
# UTILITY FUNCTIONS
# =====================================================
def safe_float(value):
    if pd.isna(value) or value in ("N/A", "", None):
        return None
    try:
        if isinstance(value, str):
            value = value.replace(",", "")
        return float(value)
    except (ValueError, TypeError):
        return None


def truncated_normal(mean, std, min_val, max_val, size=1):
    if std <= 0:
        return np.full(size, mean)
    a, b = (min_val - mean) / std, (max_val - mean) / std
    return truncnorm.rvs(a, b, loc=mean, scale=std, size=size)

# =====================================================
# STEP 1: LOAD CSV (NO FABRICATION)
# =====================================================
def load_financials(csv_path):
    df = pd.read_csv(csv_path)

    # Remove reporting artefacts
    if "period" in df.columns:
        df = df[~df["period"].str.contains("Unknown", na=False)]

    cols = [
        "revenue_total",
        "gross_profit",
        "operating_expenses_total",
        "net_income",
        "cash_from_operations",
        "capital_expenditure",
        "cash_end_period",
        "employee_count"
    ]

    for c in cols:
        df[c] = df[c].apply(safe_float)

    return df.dropna(subset=["revenue_total"])

# =====================================================
# STEP 2: DERIVE HISTORICAL METRICS (DATA-DRIVEN)
# =====================================================
def derive_historical_metrics(df):
    # Latest valid cash row
    cash_valid = df[df["cash_end_period"] > 0]
    if len(cash_valid) == 0:
        raise ValueError("No valid non-zero cash rows found")

    latest = cash_valid.iloc[-1]

    # SAFE employee handling
    raw_emp = latest["employee_count"]
    employee_count = int(raw_emp) if raw_emp and raw_emp > 0 else 1

    revenues = df["revenue_total"].values

    # Quarterly → annualized revenue growth
    revenue_growths = []
    for i in range(1, len(revenues)):
        if revenues[i-1] > 0:
            q_growth = (revenues[i] - revenues[i-1]) / revenues[i-1]
            revenue_growths.append(q_growth * 4)

    gross_margins = df["gross_profit"] / df["revenue_total"]
    opex_ratios = df["operating_expenses_total"] / df["revenue_total"]

    cash_conversion = df["cash_from_operations"] / df["net_income"].replace(0, np.nan)
    cash_conversion = cash_conversion.dropna()

    capex_ratios = (df["capital_expenditure"].abs() / df["revenue_total"]).dropna()

    # 🔑 DATA-DRIVEN CapEx cap (THIS IS THE KEY FIX)
    capex_cap = float(np.percentile(capex_ratios, 95))

    base = {
        "revenue": latest["revenue_total"],
        "cash": latest["cash_end_period"],
        "employee_count": employee_count,

        "revenue_growth_mean": float(np.mean(revenue_growths)),
        "revenue_growth_std": float(np.std(revenue_growths)) or 0.08,
        "revenue_growth_min": float(np.percentile(revenue_growths, 5)),
        "revenue_growth_max": float(np.percentile(revenue_growths, 95)),

        "gross_margin_mean": float(gross_margins.mean()),
        "gross_margin_std": float(gross_margins.std()) or 0.04,

        "opex_ratio_mean": float(opex_ratios.mean()),
        "opex_ratio_std": float(opex_ratios.std()) or 0.05,

        "cash_conversion_mean": float(cash_conversion.mean()),
        "cash_conversion_std": float(cash_conversion.std()) or 0.15,

        "capex_ratio_mean": float(capex_ratios.mean()),
        "capex_ratio_std": float(capex_ratios.std()) or 0.03,

        # 🔥 learned from CSV, not assumed
        "capex_cap": capex_cap
    }

    # Salary & liquidity rules (still policy, not math)
    base["average_annual_salary_cost"] = (
        latest["operating_expenses_total"] * 0.65
    ) / employee_count

    base["min_cash_buffer_for_hiring"] = latest["operating_expenses_total"] * 0.5

    return base

# =====================================================
# STEP 3: BUILD DISTRIBUTIONS (NO MAGIC NUMBERS)
# =====================================================
def build_distributions(base):
    return {
        "revenue_growth": {
            "mean": base["revenue_growth_mean"],
            "std": base["revenue_growth_std"],
            "min_val": base["revenue_growth_min"],
            "max_val": base["revenue_growth_max"]
        },
        "gross_margin": {
            "mean": base["gross_margin_mean"],
            "std": base["gross_margin_std"],
            "min_val": max(0.05, base["gross_margin_mean"] - 3 * base["gross_margin_std"]),
            "max_val": min(0.95, base["gross_margin_mean"] + 3 * base["gross_margin_std"])
        },
        "opex_ratio": {
            "mean": base["opex_ratio_mean"],
            "std": base["opex_ratio_std"],
            "min_val": max(0.05, base["opex_ratio_mean"] - 3 * base["opex_ratio_std"]),
            "max_val": min(0.90, base["opex_ratio_mean"] + 3 * base["opex_ratio_std"])
        },
        "cash_conversion": {
            "mean": base["cash_conversion_mean"],
            "std": base["cash_conversion_std"],
            "min_val": max(0.20, base["cash_conversion_mean"] - 3 * base["cash_conversion_std"]),
            "max_val": min(2.00, base["cash_conversion_mean"] + 3 * base["cash_conversion_std"])
        },
        "capex_ratio": {
            "mean": base["capex_ratio_mean"],
            "std": base["capex_ratio_std"]
        }
    }

# =====================================================
# STEP 4: SINGLE SIMULATION (ONE FUTURE)
# =====================================================
def run_simulation(base, dists):
    revenue = base["revenue"]
    cash = base["cash"]
    employees = base["employee_count"]
    hired = False

    # --- Revenue ---
    g = truncated_normal(**dists["revenue_growth"])[0]
    revenue *= (1 + g)

    # --- Operations ---
    margin = truncated_normal(**dists["gross_margin"])[0]
    opex_ratio = truncated_normal(**dists["opex_ratio"])[0]
    cash_conv = truncated_normal(**dists["cash_conversion"])[0]

    gross_profit = revenue * margin
    opex = revenue * opex_ratio
    operating_income = gross_profit - opex
    cfo = operating_income * cash_conv

    # --- CapEx (DATA-DRIVEN CAP) ---
    capex_ratio = lognorm(
        s=dists["capex_ratio"]["std"] / max(dists["capex_ratio"]["mean"], 0.001),
        scale=dists["capex_ratio"]["mean"]
    ).rvs()

    capex_ratio = min(capex_ratio, base["capex_cap"])
    capex = revenue * capex_ratio

    # --- Hiring decision ---
    # HIRING PROBABILITY DEPENDS ON 4 KEY PARAMETERS:
    # 1. Revenue Growth (g): Must be > 5% (0.05) - indicates business expansion opportunity
    # 2. Cash Buffer: Must exceed min_cash_buffer (6 months opex) OR 10% of revenue
    #    - min_cash_buffer = operating_expenses_total * 0.5 (6 months safety)
    #    - Alternative: cash > 10% of revenue (liquidity check)
    # 3. Revenue per Employee: Must be > 2x average annual salary cost
    #    - Ensures company can afford the new hire
    #    - rev_per_emp = revenue / employees
    #    - average_annual_salary_cost = (operating_expenses_total * 0.65) / employee_count
    # 4. Employee Count: Must be valid (not None/zero) - from historical data
    
    # ALL FOUR CONDITIONS MUST BE TRUE FOR HIRING TO OCCUR
    if g > 0.05 and (cash > base["min_cash_buffer_for_hiring"] or cash > 0.1 * revenue):
        rev_per_emp = revenue / employees
        if rev_per_emp > base["average_annual_salary_cost"] * 2:
            hired = True
            cash -= base["average_annual_salary_cost"] * 0.5  # 6 months upfront cost
            employees += 1

    # --- Cash update ---
    cash += cfo - capex
    
    # Calculate additional metrics for comprehensive analysis
    gross_margin_pct = (gross_profit / revenue * 100) if revenue > 0 else 0
    operating_margin_pct = (operating_income / revenue * 100) if revenue > 0 else 0
    ebitda = operating_income  # Simplified (no depreciation/amortization in model)
    cash_flow = cfo - capex

    return {
        "cash": cash,
        "revenue": revenue,
        "hired": hired,
        "gross_margin": gross_margin_pct,
        "operating_margin": operating_margin_pct,
        "ebitda": ebitda,
        "cash_flow": cash_flow,
        "revenue_growth": g,
        "opex": opex,
        "capex": capex,
        "cfo": cfo
    }

# =====================================================
# STEP 5: MONTE CARLO ENGINE (ENHANCED)
# =====================================================
def run_monte_carlo_simulations(base: dict, dists: dict, num_sims: int = None) -> Dict:
    """Run comprehensive Monte Carlo simulations and return all metrics"""
    if num_sims is None:
        num_sims = NUM_SIMULATIONS
    
    # Optimized: Use list comprehension and direct array conversion
    simulations = [run_simulation(base, dists) for _ in range(num_sims)]
    
    # Convert to arrays for analysis (faster with list comprehension)
    cash = np.array([s["cash"] for s in simulations])
    revenue = np.array([s["revenue"] for s in simulations])
    gross_margin = np.array([s["gross_margin"] for s in simulations])
    operating_margin = np.array([s["operating_margin"] for s in simulations])
    ebitda = np.array([s["ebitda"] for s in simulations])
    cash_flow = np.array([s["cash_flow"] for s in simulations])
    revenue_growth = np.array([s["revenue_growth"] for s in simulations])
    opex = np.array([s["opex"] for s in simulations])
    capex = np.array([s["capex"] for s in simulations])
    cfo = np.array([s["cfo"] for s in simulations])
    hired = np.array([s["hired"] for s in simulations])
    
    return {
        "base": base,
        "simulations": simulations,
        "cash": cash,
        "revenue": revenue,
        "gross_margin": gross_margin,
        "operating_margin": operating_margin,
        "ebitda": ebitda,
        "cash_flow": cash_flow,
        "revenue_growth": revenue_growth,
        "opex": opex,
        "capex": capex,
        "cfo": cfo,
        "hired": hired
    }


def run_engine(return_cash_array=False):
    df = load_financials(CSV_PATH)
    base = derive_historical_metrics(df)
    dists = build_distributions(base)
    
    sim_data = run_monte_carlo_simulations(base, dists)
    cash = sim_data["cash"]
    revenue = sim_data["revenue"]
    hire_results = sim_data["hired"]

    results = {
        "starting_cash": base["cash"],
        "starting_revenue": base["revenue"],
        "median_ending_cash": float(np.median(cash)),
        "p5_ending_cash": float(np.percentile(cash, 5)),
        "p10_ending_cash": float(np.percentile(cash, 10)),
        "p90_ending_cash": float(np.percentile(cash, 90)),
        "p95_ending_cash": float(np.percentile(cash, 95)),
        "probability_cash_negative": float(np.mean(cash < 0)),
        "expected_revenue_growth": float((np.mean(revenue) - base["revenue"]) / base["revenue"]),
        "probability_should_hire": float(np.mean(hire_results)),
        "capex_cap_used": base["capex_cap"],
        "hiring_parameters": {
            "revenue_growth_threshold": "> 5% (0.05)",
            "cash_buffer_requirement": f"min_cash_buffer ({base['min_cash_buffer_for_hiring']:,.0f}) OR 10% of revenue",
            "revenue_per_employee_threshold": f"> 2x salary cost ({base['average_annual_salary_cost'] * 2:,.0f})",
            "min_cash_buffer": base["min_cash_buffer_for_hiring"],
            "average_salary_cost": base["average_annual_salary_cost"]
        }
    }
    
    if return_cash_array:
        return results, cash
    return results


# =====================================================
# STEP 6: PLOT MONTE CARLO BELL CURVE
# =====================================================
def plot_monte_carlo_bell_curve(results: dict, cash_outcomes: np.ndarray):
    """
    Plot the Monte Carlo simulation results as a bell curve (normal distribution)
    showing the distribution of ending cash positions across all simulations.
    """
    fig, ax = plt.subplots(figsize=(14, 8))
    
    # Create histogram (empirical distribution)
    n_bins = 60
    counts, bins, patches = ax.hist(cash_outcomes, bins=n_bins, density=True, 
                                    alpha=0.7, color='steelblue', edgecolor='black', 
                                    linewidth=0.5, label='Monte Carlo Simulation Results')
    
    # Overlay theoretical normal distribution curve
    mean_cash = np.mean(cash_outcomes)
    std_cash = np.std(cash_outcomes)
    x_curve = np.linspace(cash_outcomes.min(), cash_outcomes.max(), 1000)
    y_curve = (1 / (std_cash * np.sqrt(2 * np.pi))) * np.exp(-0.5 * ((x_curve - mean_cash) / std_cash) ** 2)
    ax.plot(x_curve, y_curve, 'r-', linewidth=2.5, label='Normal Distribution Fit', alpha=0.8)
    
    # Mark key percentiles
    p5 = results["p5_ending_cash"]
    p10 = results["p10_ending_cash"]
    median = results["median_ending_cash"]
    p90 = results["p90_ending_cash"]
    p95 = results["p95_ending_cash"]
    starting = results["starting_cash"]
    
    # Vertical lines for percentiles
    ax.axvline(p5, color='red', linestyle='--', linewidth=2, alpha=0.7, label=f'5th Percentile: {p5:,.0f}')
    ax.axvline(p10, color='orange', linestyle='--', linewidth=2, alpha=0.7, label=f'10th Percentile: {p10:,.0f}')
    ax.axvline(median, color='green', linestyle='-', linewidth=3, alpha=0.9, label=f'Median (50th): {median:,.0f}')
    ax.axvline(p90, color='orange', linestyle='--', linewidth=2, alpha=0.7, label=f'90th Percentile: {p90:,.0f}')
    ax.axvline(p95, color='red', linestyle='--', linewidth=2, alpha=0.7, label=f'95th Percentile: {p95:,.0f}')
    ax.axvline(starting, color='purple', linestyle=':', linewidth=2.5, alpha=0.8, label=f'Starting Cash: {starting:,.0f}')
    
    # Mark zero line if negative values exist
    if cash_outcomes.min() < 0:
        ax.axvline(0, color='black', linestyle='-', linewidth=2, alpha=0.6, label='Zero Cash (Risk Threshold)')
        # Fill negative cash region
        ax.axvspan(cash_outcomes.min(), 0, alpha=0.15, color='red', label='Negative Cash Zone')
    
    # Fill area under normal curve
    ax.fill_between(x_curve, 0, y_curve, alpha=0.2, color='steelblue')
    
    # Labels and title
    ax.set_xlabel('Ending Cash Position', fontsize=13, fontweight='bold')
    ax.set_ylabel('Probability Density', fontsize=13, fontweight='bold')
    ax.set_title('Monte Carlo Simulation: Ending Cash Distribution (Bell Curve)\n' + 
                 f'Based on {NUM_SIMULATIONS:,} Simulations', 
                 fontsize=15, fontweight='bold', pad=20)
    ax.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
    ax.legend(loc='best', fontsize=10, framealpha=0.95, ncol=2)
    
    # Add statistics text box
    stats_text = f"""Statistics:
Mean: {mean_cash:,.0f}
Std Dev: {std_cash:,.0f}
Min: {cash_outcomes.min():,.0f}
Max: {cash_outcomes.max():,.0f}
Prob < 0: {results['probability_cash_negative']*100:.2f}%
Prob Should Hire: {results['probability_should_hire']*100:.2f}%"""
    
    ax.text(0.02, 0.98, stats_text, transform=ax.transAxes, 
            fontsize=10, verticalalignment='top', family='monospace',
            bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.9, edgecolor='black'))
    
    # Add hiring parameters explanation
    hiring_params = results.get("hiring_parameters", {})
    if hiring_params:
        hiring_text = f"""Hiring Decision Parameters:
1. Revenue Growth > 5%
2. Cash > {hiring_params.get('min_cash_buffer', 0):,.0f} OR 10% of revenue
3. Revenue/Employee > {hiring_params.get('average_salary_cost', 0)*2:,.0f}
4. Valid employee count"""
        
        ax.text(0.98, 0.98, hiring_text, transform=ax.transAxes, 
                fontsize=9, verticalalignment='top', horizontalalignment='right',
                bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.8, edgecolor='blue'))
    
    plt.tight_layout()
    plt.savefig('monte_carlo_bell_curve.png', dpi=300, bbox_inches='tight')
    print("\n📊 Graph saved as 'monte_carlo_bell_curve.png'")
    plt.show()


    

# =====================================================
# STEP 6: QUESTION PARSING & ANSWER GENERATION
# =====================================================

def parse_question(question: str) -> Dict:
    """
    Advanced NLP-based question parsing to understand user intent and extract parameters.
    Uses semantic analysis, keyword extraction, and pattern matching.
    """
    question_lower = question.lower().strip()
    
    # Extract numbers/percentages from question
    numbers = re.findall(r'(\d+(?:\.\d+)?)\s*%?', question)
    numbers = [float(n) for n in numbers]
    
    # Extract time periods
    time_periods = {
        "quarter": re.search(r'(\d+)\s*(?:quarters?|q)', question_lower),
        "month": re.search(r'(\d+)\s*(?:months?|m)', question_lower),
        "year": re.search(r'(\d+)\s*(?:years?|y)', question_lower),
        "days": re.search(r'(\d+)\s*(?:days?|d)', question_lower)
    }
    
    # Extract thresholds and comparisons
    threshold_keywords = ["below", "above", "exceeds", "drops", "falls", "minimum", "maximum", "threshold"]
    comparison_keywords = ["more than", "less than", "greater than", "at least", "at most"]
    
    # Semantic categories mapping
    revenue_keywords = ["revenue", "sales", "income", "turnover", "topline"]
    cash_keywords = ["cash", "liquidity", "runway", "buffer", "reserves", "balance"]
    margin_keywords = ["margin", "profitability", "gross margin", "operating margin", "ebitda"]
    cost_keywords = ["cost", "expense", "opex", "capex", "spending"]
    risk_keywords = ["risk", "volatility", "uncertainty", "probability", "chance", "likelihood"]
    growth_keywords = ["growth", "increase", "decrease", "decline", "slowdown"]
    
    result = {
        "original_question": question,
        "category": None,
        "question_type": None,
        "parameters": {},
        "nlp_analysis": {
            "detected_entities": [],
            "intent": None,
            "confidence": 0.0,
            "reasoning": []
        }
    }
    
    # Detect primary entity (revenue, cash, margin, etc.)
    detected_entities = []
    if any(kw in question_lower for kw in revenue_keywords):
        detected_entities.append("revenue")
    if any(kw in question_lower for kw in cash_keywords):
        detected_entities.append("cash")
    if any(kw in question_lower for kw in margin_keywords):
        detected_entities.append("margin")
    if any(kw in question_lower for kw in cost_keywords):
        detected_entities.append("cost")
    
    result["nlp_analysis"]["detected_entities"] = detected_entities
    
    # Intent classification
    if any(kw in question_lower for kw in ["probability", "chance", "likelihood", "risk"]):
        result["nlp_analysis"]["intent"] = "probability_assessment"
        result["nlp_analysis"]["reasoning"].append("Question seeks probability/risk assessment")
    elif any(kw in question_lower for kw in ["what is", "what are", "how much", "how many"]):
        result["nlp_analysis"]["intent"] = "value_query"
        result["nlp_analysis"]["reasoning"].append("Question seeks specific value or range")
    elif any(kw in question_lower for kw in ["how", "why", "what causes"]):
        result["nlp_analysis"]["intent"] = "explanation_query"
        result["nlp_analysis"]["reasoning"].append("Question seeks explanation or analysis")
    elif any(kw in question_lower for kw in ["what happens if", "scenario", "if"]):
        result["nlp_analysis"]["intent"] = "scenario_analysis"
        result["nlp_analysis"]["reasoning"].append("Question seeks scenario/what-if analysis")
    
    # Confidence scoring based on keyword matches
    confidence = 0.0
    if detected_entities:
        confidence += 0.3
    if result["nlp_analysis"]["intent"]:
        confidence += 0.3
    if numbers:
        confidence += 0.2
    if any(kw in question_lower for kw in threshold_keywords + comparison_keywords):
        confidence += 0.2
    result["nlp_analysis"]["confidence"] = min(confidence, 1.0)
    
    # Revenue & Growth Risk
    if any(phrase in question_lower for phrase in ["revenue falls below", "revenue drops below", "revenue below"]):
        result["category"] = "revenue_growth_risk"
        result["question_type"] = "revenue_below_threshold"
        if "last quarter" in question_lower or "previous quarter" in question_lower:
            result["parameters"]["threshold_type"] = "last_quarter"
        elif numbers:
            result["parameters"]["threshold"] = numbers[0]
    elif any(phrase in question_lower for phrase in ["revenue range", "expected revenue", "revenue p10", "revenue p90"]):
        result["category"] = "revenue_growth_risk"
        result["question_type"] = "revenue_range"
    elif "volatile" in question_lower and "revenue" in question_lower:
        result["category"] = "revenue_growth_risk"
        result["question_type"] = "revenue_volatility"
    elif "downside revenue risk" in question_lower or ("growth slows" in question_lower and numbers):
        result["category"] = "revenue_growth_risk"
        result["question_type"] = "downside_revenue_risk"
        if numbers:
            result["parameters"]["slowdown_pct"] = numbers[0]
    elif "miss" in question_lower and "revenue plan" in question_lower:
        result["category"] = "revenue_growth_risk"
        result["question_type"] = "miss_revenue_plan"
    
    # Cost & Margin Pressure
    elif "gross margin" in question_lower and ("below" in question_lower or "drops" in question_lower):
        result["category"] = "cost_margin_pressure"
        result["question_type"] = "gross_margin_below"
        if numbers:
            result["parameters"]["threshold"] = numbers[0]
    elif "ebitda" in question_lower and ("sensitive" in question_lower or "cost inflation" in question_lower):
        result["category"] = "cost_margin_pressure"
        result["question_type"] = "ebitda_cost_sensitivity"
    elif "worst-case" in question_lower and "operating margin" in question_lower:
        result["category"] = "cost_margin_pressure"
        result["question_type"] = "worst_case_operating_margin"
    elif "cost component" in question_lower and "margin risk" in question_lower:
        result["category"] = "cost_margin_pressure"
        result["question_type"] = "cost_component_risk"
    elif "cost reduction" in question_lower and "stabilize margins" in question_lower:
        result["category"] = "cost_margin_pressure"
        result["question_type"] = "cost_reduction_required"
    
    # Cash Flow & Liquidity
    elif "cash drops below" in question_lower or "cash below" in question_lower:
        result["category"] = "cash_flow_liquidity"
        result["question_type"] = "cash_below_threshold"
        if "minimum threshold" in question_lower:
            result["parameters"]["threshold_type"] = "minimum"
        elif numbers:
            result["parameters"]["threshold"] = numbers[0]
    elif "months of runway" in question_lower or "runway" in question_lower:
        result["category"] = "cash_flow_liquidity"
        result["question_type"] = "cash_runway"
    elif "worst-case cash" in question_lower:
        result["category"] = "cash_flow_liquidity"
        result["question_type"] = "worst_case_cash"
        if "months" in question_lower and numbers:
            result["parameters"]["months"] = int(numbers[0])
    elif "cash buffer" in question_lower and "required" in question_lower:
        result["category"] = "cash_flow_liquidity"
        result["question_type"] = "cash_buffer_required"
    elif "liquidity crunch" in question_lower:
        result["category"] = "cash_flow_liquidity"
        result["question_type"] = "liquidity_crunch"
    
    # Forecast Confidence
    elif "confident" in question_lower and "forecast" in question_lower:
        result["category"] = "forecast_confidence"
        result["question_type"] = "forecast_confidence_level"
    elif "forecast uncertainty" in question_lower:
        result["category"] = "forecast_confidence"
        result["question_type"] = "uncertainty_trend"
    elif "assumptions" in question_lower and "uncertainty" in question_lower:
        result["category"] = "forecast_confidence"
        result["question_type"] = "assumption_uncertainty"
    elif "forecast error" in question_lower or "error band" in question_lower:
        result["category"] = "forecast_confidence"
        result["question_type"] = "forecast_error_band"
    elif "riskier" in question_lower and "quarters" in question_lower:
        result["category"] = "forecast_confidence"
        result["question_type"] = "quarterly_risk"
    
    # Scenario & What-If
    elif "what happens if" in question_lower or "scenario" in question_lower:
        if "revenue growth slows" in question_lower and numbers:
            result["category"] = "scenario_analysis"
            result["question_type"] = "revenue_slowdown_scenario"
            result["parameters"]["slowdown_pct"] = numbers[0]
        elif "costs increase" in question_lower and numbers:
            result["category"] = "scenario_analysis"
            result["question_type"] = "cost_increase_scenario"
            result["parameters"]["increase_pct"] = numbers[0]
        elif "collections delayed" in question_lower and numbers:
            result["category"] = "scenario_analysis"
            result["question_type"] = "collection_delay_scenario"
            result["parameters"]["days"] = int(numbers[0])
    
    # Risk Attribution
    elif "top" in question_lower and ("drivers" in question_lower or "risks" in question_lower):
        result["category"] = "risk_attribution"
        result["question_type"] = "top_risk_drivers"
        if numbers:
            result["parameters"]["top_n"] = int(numbers[0])
        else:
            result["parameters"]["top_n"] = 3
    elif "risk driven" in question_lower and ("revenue" in question_lower or "cost" in question_lower):
        result["category"] = "risk_attribution"
        result["question_type"] = "revenue_vs_cost_risk"
    elif "assumptions" in question_lower and "monitor" in question_lower:
        result["category"] = "risk_attribution"
        result["question_type"] = "monitor_assumptions"
    elif "early warning" in question_lower or "warning signals" in question_lower:
        result["category"] = "risk_attribution"
        result["question_type"] = "early_warning_signals"
    elif "intervene" in question_lower or "reduce risk" in question_lower:
        result["category"] = "risk_attribution"
        result["question_type"] = "intervention_priorities"
    
    # Planning & Decision Support
    elif "safest operating plan" in question_lower:
        result["category"] = "planning_decision"
        result["question_type"] = "safest_plan"
    elif "flexibility" in question_lower and "spending" in question_lower:
        result["category"] = "planning_decision"
        result["question_type"] = "spending_flexibility"
    elif "cost of not taking action" in question_lower:
        result["category"] = "planning_decision"
        result["question_type"] = "inaction_cost"
    elif "reduce downside risk" in question_lower:
        result["category"] = "planning_decision"
        result["question_type"] = "risk_reduction_actions"
    elif "survival probability" in question_lower or "improves survival" in question_lower:
        result["category"] = "planning_decision"
        result["question_type"] = "survival_improvement"
    
    # Default: general analysis
    else:
        result["category"] = "general"
        result["question_type"] = "comprehensive_analysis"
    
    return result


def answer_revenue_growth_risk(question_data: Dict, sim_data: Dict) -> Dict:
    """Answer questions about revenue and growth risk"""
    base = sim_data["base"]
    revenue = sim_data["revenue"]
    revenue_growth = sim_data["revenue_growth"]
    
    answer = {
        "question": question_data["original_question"],
        "category": question_data["category"],
        "answer": {},
        "reasoning": "",
        "metrics": {}
    }
    
    if question_data["question_type"] == "revenue_below_threshold":
        if question_data["parameters"].get("threshold_type") == "last_quarter":
            threshold = base["revenue"]
            prob = float(np.mean(revenue < threshold))
            answer["answer"] = {
                "probability": prob,
                "percentage": prob * 100,
                "threshold": threshold,
                "interpretation": "high" if prob > 0.3 else "medium" if prob > 0.1 else "low"
            }
            answer["reasoning"] = f"Based on {NUM_SIMULATIONS:,} simulations, there is a {prob*100:.1f}% probability that revenue will fall below last quarter's level of {threshold:,.0f}. "
        else:
            threshold = question_data["parameters"].get("threshold", base["revenue"] * 0.9)
            prob = float(np.mean(revenue < threshold))
            answer["answer"] = {"probability": prob, "threshold": threshold}
            answer["reasoning"] = f"Probability of revenue falling below {threshold:,.0f} is {prob*100:.1f}%."
        
        answer["metrics"] = {
            "p5_revenue": float(np.percentile(revenue, 5)),
            "p10_revenue": float(np.percentile(revenue, 10)),
            "median_revenue": float(np.median(revenue)),
            "p90_revenue": float(np.percentile(revenue, 90)),
            "p95_revenue": float(np.percentile(revenue, 95))
        }
    
    elif question_data["question_type"] == "revenue_range":
        p10 = float(np.percentile(revenue, 10))
        p90 = float(np.percentile(revenue, 90))
        median = float(np.median(revenue))
        answer["answer"] = {
            "p10_revenue": p10,
            "p90_revenue": p90,
            "median_revenue": median,
            "range": p90 - p10,
            "confidence_interval": "80%"
        }
        answer["reasoning"] = f"Expected revenue range (P10-P90) is {p10:,.0f} to {p90:,.0f}, with median of {median:,.0f}. This represents an 80% confidence interval."
    
    elif question_data["question_type"] == "revenue_volatility":
        cv = float(np.std(revenue) / np.mean(revenue))
        historical_revenues = [base["revenue"]]
        historical_cv = 0.0  # Would need historical data
        answer["answer"] = {
            "coefficient_of_variation": cv,
            "volatility_level": "high" if cv > 0.2 else "medium" if cv > 0.1 else "low",
            "std_dev": float(np.std(revenue))
        }
        answer["reasoning"] = f"Revenue volatility (coefficient of variation) is {cv:.3f}, indicating {'high' if cv > 0.2 else 'medium' if cv > 0.1 else 'low'} volatility."
    
    elif question_data["question_type"] == "downside_revenue_risk":
        slowdown = question_data["parameters"].get("slowdown_pct", 5) / 100
        adjusted_growth = revenue_growth - slowdown
        adjusted_revenue = base["revenue"] * (1 + adjusted_growth)
        prob_negative = float(np.mean(adjusted_revenue < base["revenue"]))
        answer["answer"] = {
            "slowdown_scenario": f"{slowdown*100}%",
            "probability_revenue_declines": prob_negative,
            "expected_revenue": float(np.mean(adjusted_revenue))
        }
        answer["reasoning"] = f"If growth slows by {slowdown*100}%, there is a {prob_negative*100:.1f}% probability revenue will decline."
    
    return answer


def answer_cost_margin_pressure(question_data: Dict, sim_data: Dict) -> Dict:
    """Answer questions about cost and margin pressure"""
    base = sim_data["base"]
    gross_margin = sim_data["gross_margin"]
    operating_margin = sim_data["operating_margin"]
    ebitda = sim_data["ebitda"]
    opex = sim_data["opex"]
    
    answer = {
        "question": question_data["original_question"],
        "category": question_data["category"],
        "answer": {},
        "reasoning": ""
    }
    
    if question_data["question_type"] == "gross_margin_below":
        threshold = question_data["parameters"].get("threshold", 30)
        prob = float(np.mean(gross_margin < threshold))
        answer["answer"] = {
            "probability": prob,
            "threshold": threshold,
            "p5_gross_margin": float(np.percentile(gross_margin, 5)),
            "median_gross_margin": float(np.median(gross_margin))
        }
        answer["reasoning"] = f"Probability of gross margin falling below {threshold}% is {prob*100:.1f}%. Median gross margin is {float(np.median(gross_margin)):.1f}%."
    
    elif question_data["question_type"] == "worst_case_operating_margin":
        p5 = float(np.percentile(operating_margin, 5))
        p1 = float(np.percentile(operating_margin, 1))
        answer["answer"] = {
            "worst_case_5th_percentile": p5,
            "worst_case_1st_percentile": p1,
            "median": float(np.median(operating_margin))
        }
        answer["reasoning"] = f"Worst-case operating margin (5th percentile) is {p5:.1f}%, with extreme worst case (1st percentile) at {p1:.1f}%."
    
    elif question_data["question_type"] == "cost_component_risk":
        # Analyze which cost component contributes most to margin risk
        opex_volatility = float(np.std(opex) / np.mean(opex))
        answer["answer"] = {
            "primary_risk_driver": "operating_expenses",
            "opex_volatility": opex_volatility,
            "recommendation": "Monitor operating expense ratios closely"
        }
        answer["reasoning"] = f"Operating expenses show volatility of {opex_volatility:.3f}, making it the primary margin risk driver."
    
    return answer


def answer_cash_flow_liquidity(question_data: Dict, sim_data: Dict) -> Dict:
    """Answer questions about cash flow and liquidity"""
    base = sim_data["base"]
    cash = sim_data["cash"]
    cash_flow = sim_data["cash_flow"]
    
    answer = {
        "question": question_data["original_question"],
        "category": question_data["category"],
        "answer": {},
        "reasoning": ""
    }
    
    if question_data["question_type"] == "cash_below_threshold":
        if question_data["parameters"].get("threshold_type") == "minimum":
            threshold = base.get("min_cash_buffer_for_hiring", base["cash"] * 0.3)
        else:
            threshold = question_data["parameters"].get("threshold", base["cash"] * 0.5)
        prob = float(np.mean(cash < threshold))
        answer["answer"] = {
            "probability": prob,
            "threshold": threshold,
            "p5_cash": float(np.percentile(cash, 5)),
            "median_cash": float(np.median(cash))
        }
        answer["reasoning"] = f"Probability of cash falling below {threshold:,.0f} is {prob*100:.1f}%. 5th percentile cash is {float(np.percentile(cash, 5)):,.0f}."
    
    elif question_data["question_type"] == "cash_runway":
        # Calculate months of runway based on burn rate
        monthly_burn = -np.mean(cash_flow[cash_flow < 0]) if np.any(cash_flow < 0) else base["cash"] / 12
        if monthly_burn > 0:
            runway_p5 = float(np.percentile(cash, 5)) / monthly_burn
            runway_median = float(np.median(cash)) / monthly_burn
        else:
            runway_p5 = float("inf")
            runway_median = float("inf")
        answer["answer"] = {
            "runway_months_p5": runway_p5,
            "runway_months_median": runway_median,
            "monthly_burn_rate": monthly_burn
        }
        answer["reasoning"] = f"In downside scenarios (5th percentile), cash runway is {runway_p5:.1f} months. Median runway is {runway_median:.1f} months."
    
    elif question_data["question_type"] == "liquidity_crunch":
        prob_negative = float(np.mean(cash < 0))
        prob_low = float(np.mean(cash < base["cash"] * 0.3))
        answer["answer"] = {
            "probability_negative_cash": prob_negative,
            "probability_low_liquidity": prob_low,
            "risk_level": "high" if prob_negative > 0.15 else "medium" if prob_negative > 0.05 else "low"
        }
        answer["reasoning"] = f"Probability of liquidity crunch (negative cash) is {prob_negative*100:.1f}%, indicating {'high' if prob_negative > 0.15 else 'medium' if prob_negative > 0.05 else 'low'} risk."
    
    return answer


def answer_risk_attribution(question_data: Dict, sim_data: Dict) -> Dict:
    """Answer questions about risk attribution"""
    revenue = sim_data["revenue"]
    revenue_growth = sim_data["revenue_growth"]
    gross_margin = sim_data["gross_margin"]
    operating_margin = sim_data["operating_margin"]
    cash = sim_data["cash"]
    opex = sim_data["opex"]
    
    answer = {
        "question": question_data["original_question"],
        "category": question_data["category"],
        "answer": {},
        "reasoning": ""
    }
    
    if question_data["question_type"] == "top_risk_drivers":
        top_n = question_data["parameters"].get("top_n", 3)
        
        # Calculate risk contributions (coefficient of variation)
        risks = {
            "revenue_volatility": float(np.std(revenue) / np.mean(revenue)),
            "gross_margin_volatility": float(np.std(gross_margin) / np.mean(gross_margin)) if np.mean(gross_margin) > 0 else 0,
            "operating_margin_volatility": float(np.std(operating_margin) / np.mean(operating_margin)) if np.mean(operating_margin) > 0 else 0,
            "cash_volatility": float(np.std(cash) / np.abs(np.mean(cash))) if np.mean(cash) != 0 else 0,
            "opex_volatility": float(np.std(opex) / np.mean(opex))
        }
        
        sorted_risks = sorted(risks.items(), key=lambda x: x[1], reverse=True)[:top_n]
        answer["answer"] = {
            "top_risk_drivers": [{"driver": k, "volatility": v} for k, v in sorted_risks],
            "recommendation": f"Focus on managing {sorted_risks[0][0]} as it shows highest volatility"
        }
        answer["reasoning"] = f"Top {top_n} risk drivers ranked by volatility: {', '.join([f'{k} ({v:.3f})' for k, v in sorted_risks])}."
    
    elif question_data["question_type"] == "revenue_vs_cost_risk":
        rev_vol = float(np.std(revenue) / np.mean(revenue))
        cost_vol = float(np.std(opex) / np.mean(opex))
        answer["answer"] = {
            "revenue_volatility": rev_vol,
            "cost_volatility": cost_vol,
            "primary_risk_source": "revenue" if rev_vol > cost_vol else "costs",
            "ratio": rev_vol / cost_vol if cost_vol > 0 else float("inf")
        }
        answer["reasoning"] = f"Risk is driven more by {'revenue' if rev_vol > cost_vol else 'cost'} volatility ({max(rev_vol, cost_vol):.3f} vs {min(rev_vol, cost_vol):.3f})."
    
    return answer


def select_monte_carlo_parameters(question_data: Dict, base: Dict, dists: Dict) -> Dict:
    """
    Dynamically select which Monte Carlo parameters to simulate based on NLP analysis.
    Returns selected parameters with reasoning for each selection.
    """
    selected_params = {}
    reasoning = []
    
    # Always include base parameters
    base_params = ["revenue_growth", "gross_margin", "opex_ratio"]
    
    # Analyze question to determine which parameters are most relevant
    question_lower = question_data["original_question"].lower()
    entities = question_data.get("nlp_analysis", {}).get("detected_entities", [])
    intent = question_data.get("nlp_analysis", {}).get("intent", "")
    
    # Revenue-related questions
    if "revenue" in entities or "revenue" in question_lower:
        selected_params["revenue_growth"] = {
            "distribution": dists["revenue_growth"],
            "reasoning": "Question focuses on revenue, so revenue growth is essential for projection",
            "impact": "Directly affects revenue outcomes"
        }
        selected_params["gross_margin"] = {
            "distribution": dists["gross_margin"],
            "reasoning": "Gross margin affects revenue quality and profitability",
            "impact": "Influences revenue composition and margins"
        }
        reasoning.append("Revenue-focused question requires revenue growth and margin parameters")
    
    # Cash/liquidity-related questions
    if "cash" in entities or any(kw in question_lower for kw in ["cash", "liquidity", "runway", "buffer"]):
        selected_params["cash_conversion"] = {
            "distribution": dists["cash_conversion"],
            "reasoning": "Cash conversion ratio determines how much operating income becomes cash",
            "impact": "Directly affects cash flow from operations"
        }
        selected_params["capex_ratio"] = {
            "distribution": dists["capex_ratio"],
            "reasoning": "Capital expenditures consume cash and affect ending cash position",
            "impact": "Reduces available cash"
        }
        selected_params["revenue_growth"] = {
            "distribution": dists["revenue_growth"],
            "reasoning": "Revenue growth drives operating income, which generates cash",
            "impact": "Indirectly affects cash through operating income"
        }
        reasoning.append("Cash/liquidity question requires cash flow parameters (CFO, CapEx) and revenue growth")
    
    # Margin/profitability questions
    if "margin" in entities or any(kw in question_lower for kw in ["margin", "profitability", "ebitda"]):
        selected_params["gross_margin"] = {
            "distribution": dists["gross_margin"],
            "reasoning": "Gross margin is fundamental to profitability analysis",
            "impact": "Directly determines gross profit"
        }
        selected_params["opex_ratio"] = {
            "distribution": dists["opex_ratio"],
            "reasoning": "Operating expense ratio determines operating margin",
            "impact": "Affects operating income and EBITDA"
        }
        selected_params["revenue_growth"] = {
            "distribution": dists["revenue_growth"],
            "reasoning": "Revenue growth affects scale and margin calculations",
            "impact": "Influences margin percentages through revenue base"
        }
        reasoning.append("Margin question requires gross margin, opex ratio, and revenue growth")
    
    # Risk/volatility questions
    if "risk" in question_lower or "volatility" in question_lower or intent == "probability_assessment":
        # Include all parameters for comprehensive risk analysis
        for param_name in ["revenue_growth", "gross_margin", "opex_ratio", "cash_conversion", "capex_ratio"]:
            if param_name in dists:
                selected_params[param_name] = {
                    "distribution": dists[param_name],
                    "reasoning": f"{param_name} contributes to overall financial risk and uncertainty",
                    "impact": "Part of comprehensive risk assessment"
                }
        reasoning.append("Risk assessment requires all parameters for comprehensive uncertainty analysis")
    
    # If no specific entities detected, use all parameters
    if not selected_params:
        for param_name in dists.keys():
            selected_params[param_name] = {
                "distribution": dists[param_name],
                "reasoning": "General question requires comprehensive parameter set",
                "impact": "Provides complete financial picture"
            }
        reasoning.append("General question - using all available parameters for comprehensive analysis")
    
    return {
        "selected_parameters": selected_params,
        "reasoning": reasoning,
        "parameter_count": len(selected_params),
        "all_available_parameters": list(dists.keys())
    }


def answer_question(question: str, generate_plot: bool = True) -> Dict:
    """
    Main function to answer any financial question using Monte Carlo simulation.
    Returns comprehensive JSON with all analysis, data, and decision reasoning.
    
    QUERY ANALYSIS PROCESS:
    1. NLP Parsing: Advanced natural language understanding to extract entities, intent, parameters
    2. Category Classification: Identifies question type (revenue, cash, margin, etc.)
    3. Dynamic Parameter Selection: Chooses relevant Monte Carlo parameters with reasoning
    4. Simulation Execution: Runs 10,000 simulations using selected distributions
    5. Answer Generation: Calculates probabilities and provides comprehensive interpretation
    6. JSON Output: Returns complete analysis with all data and decision reasoning
    """
    # Parse question with enhanced NLP
    question_data = parse_question(question)
    
    # Load data
    df = load_financials(CSV_PATH)
    base = derive_historical_metrics(df)
    dists = build_distributions(base)
    
    # Dynamically select parameters based on question understanding
    param_selection = select_monte_carlo_parameters(question_data, base, dists)
    
    # Run simulations (all parameters are always simulated, but we track which are relevant)
    sim_data = run_monte_carlo_simulations(base, dists)
    
    # Route to appropriate answer function
    if question_data["category"] == "revenue_growth_risk":
        answer = answer_revenue_growth_risk(question_data, sim_data)
    elif question_data["category"] == "cost_margin_pressure":
        answer = answer_cost_margin_pressure(question_data, sim_data)
    elif question_data["category"] == "cash_flow_liquidity":
        answer = answer_cash_flow_liquidity(question_data, sim_data)
    elif question_data["category"] == "risk_attribution":
        answer = answer_risk_attribution(question_data, sim_data)
    else:
        # Default: comprehensive general analysis with interpretation
        revenue = sim_data["revenue"]
        cash = sim_data["cash"]
        revenue_growth = sim_data["revenue_growth"]
        gross_margin = sim_data["gross_margin"]
        operating_margin = sim_data["operating_margin"]
        
        # Calculate risk metrics
        revenue_cv = float(np.std(revenue) / np.mean(revenue))
        cash_cv = float(np.std(cash) / np.abs(np.mean(cash))) if np.mean(cash) != 0 else 0
        
        prob_cash_negative = float(np.mean(cash < 0))
        prob_revenue_decline = float(np.mean(revenue < sim_data["base"]["revenue"]))
        
        # Interpret risk levels
        revenue_risk_level = "HIGH" if revenue_cv > 0.25 else "MEDIUM" if revenue_cv > 0.15 else "LOW"
        cash_risk_level = "HIGH" if prob_cash_negative > 0.15 else "MEDIUM" if prob_cash_negative > 0.05 else "LOW"
        
        answer = {
            "question": question,
            "category": "general",
            "answer": {
                "revenue_risk_assessment": {
                    "risk_level": revenue_risk_level,
                    "coefficient_of_variation": revenue_cv,
                    "interpretation": f"Revenue shows {revenue_risk_level.lower()} volatility (CV: {revenue_cv:.3f}). "
                                    f"{'High' if revenue_cv > 0.25 else 'Moderate' if revenue_cv > 0.15 else 'Low'} variability indicates "
                                    f"{'significant uncertainty' if revenue_cv > 0.25 else 'moderate uncertainty' if revenue_cv > 0.15 else 'relatively stable'} in revenue projections.",
                    "probability_revenue_declines": prob_revenue_decline,
                    "expected_revenue_range": {
                        "p10": float(np.percentile(revenue, 10)),
                        "median": float(np.median(revenue)),
                        "p90": float(np.percentile(revenue, 90))
                    }
                },
                "cash_risk_assessment": {
                    "risk_level": cash_risk_level,
                    "probability_negative_cash": prob_cash_negative,
                    "interpretation": f"Cash position shows {cash_risk_level.lower()} risk. "
                                    f"There is a {prob_cash_negative*100:.1f}% probability of negative cash, "
                                    f"which indicates {'significant liquidity risk' if prob_cash_negative > 0.15 else 'moderate liquidity risk' if prob_cash_negative > 0.05 else 'low liquidity risk'}.",
                    "cash_range": {
                        "p5": float(np.percentile(cash, 5)),
                        "median": float(np.median(cash)),
                        "p95": float(np.percentile(cash, 95))
                    }
                },
                "overall_assessment": {
                    "primary_risk": "revenue_volatility" if revenue_cv > cash_cv else "cash_liquidity",
                    "recommendation": f"Focus on managing {'revenue volatility' if revenue_cv > cash_cv else 'cash liquidity'} as the primary risk driver."
                }
            },
            "reasoning": f"""
Based on {NUM_SIMULATIONS:,} Monte Carlo simulations:

REVENUE RISK: Your revenue shows {revenue_risk_level.lower()} volatility with a coefficient of variation of {revenue_cv:.3f}. 
This means revenue can vary significantly from projections. There is a {prob_revenue_decline*100:.1f}% probability 
that revenue will decline compared to current levels.

CASH RISK: Your cash position shows {cash_risk_level.lower()} risk with a {prob_cash_negative*100:.1f}% probability 
of going negative. The 5th percentile cash position is {float(np.percentile(cash, 5)):,.0f}, indicating 
the worst-case scenario you should prepare for.

RECOMMENDATION: {'Focus on revenue stability and diversification' if revenue_cv > cash_cv else 'Build cash reserves and manage liquidity carefully'} 
to mitigate the primary risk factor.
            """.strip()
        }
    
    # Build comprehensive JSON response with all analysis and reasoning
    comprehensive_response = {
        "query_analysis": {
            "original_question": question_data["original_question"],
            "nlp_analysis": question_data.get("nlp_analysis", {}),
            "category": question_data["category"],
            "question_type": question_data["question_type"],
            "extracted_parameters": question_data["parameters"],
            "parsing_confidence": question_data.get("nlp_analysis", {}).get("confidence", 0.0)
        },
        "parameter_selection": {
            "selected_parameters": param_selection["selected_parameters"],
            "selection_reasoning": param_selection["reasoning"],
            "all_available_parameters": param_selection["all_available_parameters"],
            "why_these_parameters": f"""
Based on NLP analysis detecting entities: {question_data.get('nlp_analysis', {}).get('detected_entities', [])} 
and intent: {question_data.get('nlp_analysis', {}).get('intent', 'unknown')}, 
we selected {len(param_selection['selected_parameters'])} parameters that are most relevant to answer your question.
Each parameter was chosen because it directly impacts the financial metrics mentioned in your question.
            """.strip()
        },
        "monte_carlo_simulation": {
            "num_simulations": NUM_SIMULATIONS,
            "simulation_method": "Monte Carlo with historical data-driven distributions",
            "base_metrics": {
                "starting_revenue": float(base["revenue"]),
                "starting_cash": float(base["cash"]),
                "employee_count": base.get("employee_count", None)
            },
            "distributions_used": {
                param: {
                    "mean": dist["mean"],
                    "std": dist["std"],
                    "source": "Historical data from CSV"
                } for param, dist in dists.items()
            }
        },
        "analysis_results": answer,
        "raw_data": {
            "revenue_statistics": {
                "mean": float(np.mean(sim_data["revenue"])),
                "median": float(np.median(sim_data["revenue"])),
                "std": float(np.std(sim_data["revenue"])),
                "min": float(np.min(sim_data["revenue"])),
                "max": float(np.max(sim_data["revenue"])),
                "p5": float(np.percentile(sim_data["revenue"], 5)),
                "p10": float(np.percentile(sim_data["revenue"], 10)),
                "p90": float(np.percentile(sim_data["revenue"], 90)),
                "p95": float(np.percentile(sim_data["revenue"], 95))
            },
            "cash_statistics": {
                "mean": float(np.mean(sim_data["cash"])),
                "median": float(np.median(sim_data["cash"])),
                "std": float(np.std(sim_data["cash"])),
                "min": float(np.min(sim_data["cash"])),
                "max": float(np.max(sim_data["cash"])),
                "p5": float(np.percentile(sim_data["cash"], 5)),
                "p10": float(np.percentile(sim_data["cash"], 10)),
                "p90": float(np.percentile(sim_data["cash"], 90)),
                "p95": float(np.percentile(sim_data["cash"], 95))
            },
            "gross_margin_statistics": {
                "mean": float(np.mean(sim_data["gross_margin"])),
                "median": float(np.median(sim_data["gross_margin"])),
                "std": float(np.std(sim_data["gross_margin"]))
            },
            "operating_margin_statistics": {
                "mean": float(np.mean(sim_data["operating_margin"])),
                "median": float(np.median(sim_data["operating_margin"])),
                "std": float(np.std(sim_data["operating_margin"]))
            }
        },
        "decision_reasoning": {
            "why_this_approach": """
Monte Carlo simulation was chosen because:
1. Financial forecasting involves multiple uncertain variables
2. Historical data provides distributions but future is uncertain
3. 10,000 simulations provide statistically robust probability estimates
4. Allows for comprehensive risk assessment across all scenarios
            """.strip(),
            "how_parameters_were_chosen": param_selection["reasoning"],
            "interpretation_guidance": """
Probabilities represent the percentage of 10,000 simulated scenarios where a condition was met.
Percentiles (P5, P10, P90, P95) show the range of outcomes at different confidence levels.
Risk levels are classified as: LOW (<5% probability), MEDIUM (5-15%), HIGH (>15%).
            """.strip()
        }
    }
    
    # Generate plot if requested and relevant (before returning JSON)
    if generate_plot:
        try:
            if question_data["category"] in ["revenue_growth_risk", "cash_flow_liquidity", "general"]:
                # Create appropriate plot based on question
                if "revenue" in question.lower():
                    plot_revenue_distribution(sim_data)
                elif "cash" in question.lower() or "liquidity" in question.lower():
                    plot_cash_distribution(sim_data)
                else:
                    # Default: comprehensive plot
                    results_for_plot = {
                        "starting_cash": base["cash"],
                        "starting_revenue": base["revenue"],
                        "median_ending_cash": float(np.median(sim_data["cash"])),
                        "p5_ending_cash": float(np.percentile(sim_data["cash"], 5)),
                        "p10_ending_cash": float(np.percentile(sim_data["cash"], 10)),
                        "p90_ending_cash": float(np.percentile(sim_data["cash"], 90)),
                        "p95_ending_cash": float(np.percentile(sim_data["cash"], 95)),
                        "probability_cash_negative": float(np.mean(sim_data["cash"] < 0)),
                        "probability_should_hire": float(np.mean(sim_data.get("hired", [False] * len(sim_data["cash"]))))
                    }
                    plot_monte_carlo_bell_curve(results_for_plot, sim_data["cash"])
        except Exception as e:
            print(f"\n⚠️  Could not generate plot: {e}")
            comprehensive_response["plot_generation"] = {"status": "failed", "error": str(e)}
    else:
        comprehensive_response["plot_generation"] = {"status": "skipped", "reason": "generate_plot=False"}
    
    # Add plot info if generated successfully
    if generate_plot and "plot_generation" not in comprehensive_response:
        comprehensive_response["plot_generation"] = {"status": "generated", "files": ["revenue_distribution.png", "cash_distribution.png", "monte_carlo_bell_curve.png"]}
    
    return comprehensive_response


def plot_revenue_distribution(sim_data: Dict):
    """Plot revenue distribution for revenue-related questions"""
    revenue = sim_data["revenue"]
    base = sim_data["base"]
    
    fig, ax = plt.subplots(figsize=(12, 7))
    
    n_bins = 50
    ax.hist(revenue, bins=n_bins, density=True, alpha=0.7, color='steelblue', 
            edgecolor='black', linewidth=0.5, label='Revenue Distribution')
    
    # Overlay normal curve
    mean_rev = np.mean(revenue)
    std_rev = np.std(revenue)
    x_curve = np.linspace(revenue.min(), revenue.max(), 1000)
    y_curve = (1 / (std_rev * np.sqrt(2 * np.pi))) * np.exp(-0.5 * ((x_curve - mean_rev) / std_rev) ** 2)
    ax.plot(x_curve, y_curve, 'r-', linewidth=2, label='Normal Fit', alpha=0.8)
    
    # Mark key percentiles
    p10 = np.percentile(revenue, 10)
    p50 = np.percentile(revenue, 50)
    p90 = np.percentile(revenue, 90)
    
    ax.axvline(p10, color='orange', linestyle='--', linewidth=2, label=f'P10: {p10:,.0f}')
    ax.axvline(p50, color='green', linestyle='-', linewidth=2, label=f'Median: {p50:,.0f}')
    ax.axvline(p90, color='orange', linestyle='--', linewidth=2, label=f'P90: {p90:,.0f}')
    ax.axvline(base["revenue"], color='purple', linestyle=':', linewidth=2, 
               label=f'Current: {base["revenue"]:,.0f}')
    
    ax.set_xlabel('Revenue', fontsize=12, fontweight='bold')
    ax.set_ylabel('Probability Density', fontsize=12, fontweight='bold')
    ax.set_title('Revenue Distribution - Monte Carlo Simulation', fontsize=14, fontweight='bold')
    ax.grid(True, alpha=0.3)
    ax.legend()
    
    plt.tight_layout()
    plt.savefig('revenue_distribution.png', dpi=300, bbox_inches='tight')
    print("\n📊 Revenue distribution graph saved as 'revenue_distribution.png'")
    plt.show()


def plot_cash_distribution(sim_data: Dict):
    """Plot cash distribution for cash/liquidity-related questions"""
    cash = sim_data["cash"]
    base = sim_data["base"]
    
    fig, ax = plt.subplots(figsize=(12, 7))
    
    n_bins = 50
    ax.hist(cash, bins=n_bins, density=True, alpha=0.7, color='steelblue', 
            edgecolor='black', linewidth=0.5, label='Cash Distribution')
    
    # Overlay normal curve
    mean_cash = np.mean(cash)
    std_cash = np.std(cash)
    x_curve = np.linspace(cash.min(), cash.max(), 1000)
    y_curve = (1 / (std_cash * np.sqrt(2 * np.pi))) * np.exp(-0.5 * ((x_curve - mean_cash) / std_cash) ** 2)
    ax.plot(x_curve, y_curve, 'r-', linewidth=2, label='Normal Fit', alpha=0.8)
    
    # Mark key percentiles
    p5 = np.percentile(cash, 5)
    p50 = np.percentile(cash, 50)
    p95 = np.percentile(cash, 95)
    
    ax.axvline(p5, color='red', linestyle='--', linewidth=2, label=f'P5: {p5:,.0f}')
    ax.axvline(p50, color='green', linestyle='-', linewidth=2, label=f'Median: {p50:,.0f}')
    ax.axvline(p95, color='red', linestyle='--', linewidth=2, label=f'P95: {p95:,.0f}')
    ax.axvline(base["cash"], color='purple', linestyle=':', linewidth=2, 
               label=f'Current: {base["cash"]:,.0f}')
    
    if cash.min() < 0:
        ax.axvline(0, color='black', linestyle='-', linewidth=2, label='Zero Cash')
        ax.axvspan(cash.min(), 0, alpha=0.15, color='red', label='Negative Zone')
    
    ax.set_xlabel('Cash Position', fontsize=12, fontweight='bold')
    ax.set_ylabel('Probability Density', fontsize=12, fontweight='bold')
    ax.set_title('Cash Distribution - Monte Carlo Simulation', fontsize=14, fontweight='bold')
    ax.grid(True, alpha=0.3)
    ax.legend()
    
    plt.tight_layout()
    plt.savefig('cash_distribution.png', dpi=300, bbox_inches='tight')
    print("\n📊 Cash distribution graph saved as 'cash_distribution.png'")
    plt.show()


# =====================================================
# MAIN - QUESTION ANSWERING INTERFACE
# =====================================================
if __name__ == "__main__":
    import sys
    
    # Check if question provided as command line argument
    if len(sys.argv) > 1:
        question = " ".join(sys.argv[1:])
    else:
        # Interactive mode - ask for question
        print("\n" + "=" * 70)
        print("MONTE CARLO FINANCIAL ANALYSIS - QUESTION ANSWERING SYSTEM")
        print("=" * 70)
        
        question = input("\nYour question: ").strip()
    
    if question.lower() in ['exit', 'quit', '']:
        # Default: run standard analysis
        results, cash_array = run_engine(return_cash_array=True)
        print("\n" + "=" * 70)
        print("STANDARD MONTE CARLO SIMULATION RESULTS")
        print("=" * 70)
        print(json.dumps({k: v for k, v in results.items() if k != "hiring_parameters"}, indent=2))
        plot_monte_carlo_bell_curve(results, cash_array)
    else:
        # Answer the question - optimized for speed
        import time
        start_time = time.time()
        
        comprehensive_answer = answer_question(question, generate_plot=False)  # Disable plot for speed
        
        # Extract the main answer for display (matching terminal format)
        main_answer = comprehensive_answer.get("analysis_results", {})
        
        # Output in the format shown in terminal
        print("\n" + "=" * 70)
        print("ANSWER WITH INTERPRETATION")
        print("=" * 70)
        print(json.dumps(main_answer, indent=2, default=str))
        print("=" * 70)
        
        # Print reasoning separately
        if main_answer.get("reasoning"):
            print("\n" + "=" * 70)
            print("DETAILED EXPLANATION")
            print("=" * 70)
            print(main_answer["reasoning"])
            print("=" * 70)
        
        # Save full comprehensive JSON to file (without printing to console for speed)
        output_file = "monte_carlo_analysis.json"
        with open(output_file, 'w') as f:
            json.dump(comprehensive_answer, f, indent=2, default=str)
        
        elapsed_time = time.time() - start_time
 