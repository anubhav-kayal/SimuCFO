"""
NLP Pipeline for Financial Question Answering
===============================================
This module contains all NLP parsing, question understanding, 
parameter selection, and answer generation logic.
"""

import re
import json
import numpy as np
from typing import Dict

# Import Monte Carlo simulation functions
from monte_carlo_simulations import (
    load_financials,
    derive_historical_metrics,
    build_distributions,
    run_monte_carlo_simulations,
    NUM_SIMULATIONS,
    CSV_PATH,
    plot_monte_carlo_bell_curve,
    plot_revenue_distribution,
    plot_cash_distribution
)

# =====================================================
# NLP QUESTION PARSING
# =====================================================

def parse_question(question: str) -> Dict:
    """
    Advanced NLP-based question parsing to understand user intent and extract parameters.
    Uses semantic analysis, keyword extraction, and pattern matching.
    """
    question_lower = question.lower().strip()
    
    # Check if question is non-financial
    financial_keywords = [
        "revenue", "sales", "income", "cash", "liquidity", "margin", "profit", 
        "cost", "expense", "opex", "capex", "ebitda", "growth", "risk", 
        "volatility", "forecast", "budget", "financial", "money", "dollar",
        "runway", "buffer", "hiring", "employee", "salary", "spending"
    ]
    
    is_financial_question = any(kw in question_lower for kw in financial_keywords)
    
    if not is_financial_question:
        return {
            "original_question": question,
            "category": "non_financial",
            "question_type": None,
            "parameters": {},
            "nlp_analysis": {
                "detected_entities": [],
                "intent": None,
                "confidence": 0.0,
                "reasoning": ["Question does not contain financial keywords"]
            }
        }
    
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

# =====================================================
# PARAMETER SELECTION
# =====================================================

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

# =====================================================
# ANSWER GENERATION FUNCTIONS
# =====================================================

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

# =====================================================
# MAIN ANSWER FUNCTION
# =====================================================

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
    
    # Early return for non-financial questions
    if question_data["category"] == "non_financial":
        return {
            "query_analysis": {
                "original_question": question_data["original_question"],
                "category": "non_financial",
                "nlp_analysis": question_data.get("nlp_analysis", {})
            },
            "analysis_results": {
                "question": question,
                "category": "non_financial",
                "answer": {
                    "message": "This question is not related to financial analysis. Please ask a question about revenue, cash, margins, costs, risk, or other financial metrics."
                },
                "reasoning": "The question does not contain financial keywords and cannot be answered using Monte Carlo financial simulation."
            }
        }
    
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
