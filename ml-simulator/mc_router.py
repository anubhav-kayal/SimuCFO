"""
Router Module for Monte Carlo Financial Analysis
=================================================
Connects NLP parsing, Monte Carlo simulations, and LLM interpretation.
"""

import asyncio
import base64
import os
import numpy as np
import re
from typing import Dict
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from nlp_pipeline import parse_question_with_fallback, get_or_create_assistant, API_KEY
from backboard import BackboardClient
from llm_interpreter import interpret_mc_results, get_or_create_interpreter_assistant
from monte_carlo_simulations import (
    load_financials,
    derive_historical_metrics,
    build_distributions,
    run_monte_carlo_simulations,
    plot_monte_carlo_bell_curve,
    plot_revenue_distribution,
    plot_cash_distribution,
    load_statement_chunks,
    load_data_quality,
    run_multi_period_simulations,
    plot_fan_chart,
    NUM_SIMULATIONS,
    CSV_PATH
)
from scenario_comparison import run_scenario_comparison, plot_comparison_chart
from ratio_dashboard import compute_ratios
from sensitivity_analysis import run_sensitivity, plot_tornado, plot_tornado_absolute
from anomaly_detection import run_anomaly_detection
from what_if_builder import what_if_from_session, run_what_if_comparison, apply_what_if_overrides


async def answer_question_async(question: str, client: BackboardClient, nlp_assistant_id: str, interpreter_assistant_id: str, generate_plot: bool = False, generate_fan_charts: bool = False) -> Dict:
    """
    Answer a financial question by:
    1. Parsing question using NLP pipeline (rule-based + API fallback)
    2. Running Monte Carlo simulations (monte_carlo_simulations.py)
    3. Collecting all simulation facts
    4. Generating human-readable explanation using LLM interpreter (llm_interpreter.py)
    """
    # Step 1: Parse question using NLP pipeline (rule-based + API fallback)
    nlp_result = await parse_question_with_fallback(question, client, nlp_assistant_id)

    # Step 2: Extract time period from question and NLP parsing (dynamic extraction)
    num_periods = None
    period_type = None
    question_lower = question.lower()
    parameters = nlp_result.get("parameters", {}) or nlp_result.get("nlp_analysis", {}).get("api_parameters", {})

    period_patterns = [
        (r'(\d+)\s*(?:quarters?|q)', 'quarters'),
        (r'(\d+)\s*(?:months?|m)', 'months'),
        (r'(\d+)\s*(?:years?|y)', 'years'),
        (r'last\s+(\d+)', 'quarters'),
        (r'(\d+)\s*(?:periods?|period)', 'periods')
    ]

    for pattern, ptype in period_patterns:
        match = re.search(pattern, question_lower)
        if match:
            num_periods = int(match.group(1))
            period_type = ptype
            break

    if num_periods is None:
        if "time_period" in parameters:
            time_period = str(parameters["time_period"]).lower()
            num_match = re.search(r'(\d+)', time_period)
            if num_match:
                num_periods = int(num_match.group(1))
                if "quarter" in time_period:
                    period_type = "quarters"
                elif "month" in time_period:
                    period_type = "months"
                elif "year" in time_period:
                    period_type = "years"

    # Step 3: Load financial data and filter by requested time period if specified
    df_full = load_financials(CSV_PATH)

    if num_periods is not None:
        df = df_full.tail(num_periods).copy()
        periods_used = df["period"].tolist() if "period" in df.columns else [f"Period {i+1}" for i in range(len(df))]
        note = f"Analysis based on last {num_periods} {period_type or 'periods'}: {', '.join(periods_used)}"
    else:
        df = df_full.copy()
        periods_used = df["period"].tolist() if "period" in df.columns else [f"Period {i+1}" for i in range(len(df))]
        note = f"Analysis based on all available data: {len(df)} periods"

    statement_chunks = load_statement_chunks()
    data_quality = load_data_quality()

    base = derive_historical_metrics(df)
    dists = build_distributions(base)
    sim_data = run_monte_carlo_simulations(base, dists)

    # Compute ratio dashboard
    ratio_dashboard = compute_ratios(base, sim_data, df)

    # Detect anomalies across periods
    anomaly_result = run_anomaly_detection(CSV_PATH)

    # Step 4: Extract metrics from NLP parsing result (rule-based or API fallback)
    nlp_analysis = nlp_result.get("nlp_analysis", {})
    if nlp_analysis.get("api_fallback"):
        intent = nlp_analysis.get("api_intent", "").lower()
        metric = nlp_analysis.get("api_metric", "").lower()
    else:
        intent = nlp_analysis.get("intent", "").lower()
        metric = (nlp_analysis.get("detected_entities", []) or [""])[0].lower()

    # Compute all metrics dynamically
    revenue = sim_data["revenue"]
    cash = sim_data["cash"]
    gross_margin = sim_data["gross_margin"]
    operating_margin = sim_data["operating_margin"]
    cash_flow = sim_data["cash_flow"]

    computed_metrics = {}
    computed_answer = {}

    revenue_cv = float(np.std(revenue) / np.mean(revenue)) if np.mean(revenue) > 0 else 0
    cash_cv = float(np.std(cash) / np.abs(np.mean(cash))) if np.mean(cash) != 0 else 0
    prob_cash_negative = float(np.mean(cash < 0))
    prob_revenue_decline = float(np.mean(revenue < base["revenue"]))

    historical_revenues = df["revenue_total"].values if len(df) > 1 else [base["revenue"]]
    historical_cv = float(np.std(historical_revenues) / np.mean(historical_revenues)) if len(historical_revenues) > 1 and np.mean(historical_revenues) > 0 else 0.0

    if "revenue" in metric or "revenue" in intent:
        if "below" in question.lower() or "falls" in question.lower() or "drops" in question.lower():
            threshold = parameters.get("threshold")
            if threshold is None:
                threshold = base["revenue"]
            prob = float(np.mean(revenue < threshold))
            computed_answer = {
                "probability": prob,
                "percentage": prob * 100,
                "threshold": threshold,
                "interpretation": "high" if prob > 0.3 else "medium" if prob > 0.1 else "low"
            }
            computed_metrics = {
                "p5_revenue": float(np.percentile(revenue, 5)),
                "p10_revenue": float(np.percentile(revenue, 10)),
                "median_revenue": float(np.median(revenue)),
                "p90_revenue": float(np.percentile(revenue, 90)),
                "p95_revenue": float(np.percentile(revenue, 95))
            }
        elif "risk" in question.lower() or "volatile" in question.lower() or "volatility" in question.lower():
            computed_answer = {
                "coefficient_of_variation": revenue_cv,
                "volatility_level": "high" if revenue_cv > 0.2 else "medium" if revenue_cv > 0.1 else "low",
                "probability_decline": prob_revenue_decline,
                "risk_level": "high" if revenue_cv > 0.25 else "medium" if revenue_cv > 0.15 else "low",
                "historical_volatility": historical_cv,
                "periods_compared": len(df)
            }
        elif "range" in question.lower() or "expected" in question.lower():
            computed_answer = {
                "p10_revenue": float(np.percentile(revenue, 10)),
                "p90_revenue": float(np.percentile(revenue, 90)),
                "median_revenue": float(np.median(revenue)),
                "range": float(np.percentile(revenue, 90) - np.percentile(revenue, 10)),
                "confidence_interval": "80%"
            }
        else:
            computed_answer = {
                "expected_revenue_range": {
                    "p10": float(np.percentile(revenue, 10)),
                    "median": float(np.median(revenue)),
                    "p90": float(np.percentile(revenue, 90))
                },
                "probability_decline": prob_revenue_decline,
                "volatility": revenue_cv,
                "risk_level": "high" if revenue_cv > 0.25 else "medium" if revenue_cv > 0.15 else "low"
            }

    elif "cash" in metric or "cash" in intent or "liquidity" in metric:
        if "below" in question.lower() or "drops" in question.lower():
            threshold = parameters.get("threshold")
            if threshold is None:
                threshold = base.get("min_cash_buffer_for_hiring", base["cash"] * 0.5)
            prob = float(np.mean(cash < threshold))
            computed_answer = {
                "probability": prob,
                "threshold": threshold,
                "p5_cash": float(np.percentile(cash, 5)),
                "median_cash": float(np.median(cash))
            }
        elif "runway" in question.lower():
            monthly_burn = -np.mean(cash_flow[cash_flow < 0]) if np.any(cash_flow < 0) else base["cash"] / 12
            if monthly_burn > 0:
                runway_p5 = float(np.percentile(cash, 5)) / monthly_burn
                runway_median = float(np.median(cash)) / monthly_burn
            else:
                runway_p5 = float("inf")
                runway_median = float("inf")
            computed_answer = {
                "runway_months_p5": runway_p5,
                "runway_months_median": runway_median,
                "monthly_burn_rate": monthly_burn
            }
        else:
            computed_answer = {
                "probability_negative_cash": prob_cash_negative,
                "probability_low_liquidity": float(np.mean(cash < base["cash"] * 0.3)),
                "risk_level": "high" if prob_cash_negative > 0.15 else "medium" if prob_cash_negative > 0.05 else "low",
                "p5_cash": float(np.percentile(cash, 5)),
                "median_cash": float(np.median(cash))
            }

    elif "margin" in metric or "profitability" in metric or "margin" in intent:
        if "gross" in question.lower():
            threshold = parameters.get("threshold", 30)
            prob = float(np.mean(gross_margin < threshold))
            computed_answer = {
                "probability": prob,
                "threshold": threshold,
                "p5_gross_margin": float(np.percentile(gross_margin, 5)),
                "median_gross_margin": float(np.median(gross_margin))
            }
        elif "worst" in question.lower() or "worst-case" in question.lower():
            computed_answer = {
                "worst_case_5th_percentile": float(np.percentile(operating_margin, 5)),
                "worst_case_1st_percentile": float(np.percentile(operating_margin, 1)),
                "median": float(np.median(operating_margin))
            }
        else:
            computed_answer = {
                "gross_margin": {
                    "p5": float(np.percentile(gross_margin, 5)),
                    "median": float(np.median(gross_margin))
                },
                "operating_margin": {
                    "p5": float(np.percentile(operating_margin, 5)),
                    "median": float(np.median(operating_margin))
                }
            }

    else:
        revenue_risk_level = "HIGH" if revenue_cv > 0.25 else "MEDIUM" if revenue_cv > 0.15 else "LOW"
        cash_risk_level = "HIGH" if prob_cash_negative > 0.15 else "MEDIUM" if prob_cash_negative > 0.05 else "LOW"

        computed_answer = {
            "revenue_risk_assessment": {
                "risk_level": revenue_risk_level,
                "coefficient_of_variation": revenue_cv,
                "probability_decline": prob_revenue_decline,
                "expected_revenue_range": {
                    "p10": float(np.percentile(revenue, 10)),
                    "median": float(np.median(revenue)),
                    "p90": float(np.percentile(revenue, 90))
                }
            },
            "cash_risk_assessment": {
                "risk_level": cash_risk_level,
                "probability_negative_cash": prob_cash_negative,
                "cash_range": {
                    "p5": float(np.percentile(cash, 5)),
                    "median": float(np.median(cash)),
                    "p95": float(np.percentile(cash, 95))
                }
            },
            "overall_assessment": {
                "primary_risk": "revenue_volatility" if revenue_cv > cash_cv else "cash_liquidity"
            }
        }

    # Step 5: Prepare Monte Carlo facts for LLM interpreter
    mc_facts = {
        "question": question,
        "query_context": {
            "intent": intent,
            "metric": metric,
            "parameters": parameters,
            "time_period_requested": f"{num_periods} {period_type}" if num_periods else "all available",
            "periods_analyzed": len(df),
            "periods_list": periods_used
        },
        "simulation_metadata": {
            "num_simulations": NUM_SIMULATIONS,
            "simulation_method": "Monte Carlo with historical data-driven distributions",
            "historical_data_periods": len(df),
            "statement_chunks": statement_chunks,
            "data_quality": data_quality,
            "base_metrics": {
                "starting_revenue": float(base["revenue"]),
                "starting_cash": float(base["cash"]),
                "employee_count": base.get("employee_count", None)
            },
            "_full_derived_metrics": {k: float(v) if isinstance(v, (int, float, np.floating)) and not isinstance(v, bool) else v for k, v in base.items()}
        },
        "computed_results": computed_answer,
        "statistics": {
            "revenue": {
                "mean": float(np.mean(revenue)),
                "median": float(np.median(revenue)),
                "std": float(np.std(revenue)),
                "p5": float(np.percentile(revenue, 5)),
                "p10": float(np.percentile(revenue, 10)),
                "p50": float(np.median(revenue)),
                "p90": float(np.percentile(revenue, 90)),
                "p95": float(np.percentile(revenue, 95)),
                "min": float(np.min(revenue)),
                "max": float(np.max(revenue)),
                "coefficient_of_variation": revenue_cv,
                "probability_decline": prob_revenue_decline,
                "historical_volatility": historical_cv
            },
            "cash": {
                "mean": float(np.mean(cash)),
                "median": float(np.median(cash)),
                "std": float(np.std(cash)),
                "p5": float(np.percentile(cash, 5)),
                "p10": float(np.percentile(cash, 10)),
                "p50": float(np.median(cash)),
                "p90": float(np.percentile(cash, 90)),
                "p95": float(np.percentile(cash, 95)),
                "min": float(np.min(cash)),
                "max": float(np.max(cash)),
                "probability_negative": prob_cash_negative,
                "coefficient_of_variation": cash_cv
            },
            "gross_margin": {
                "mean": float(np.mean(gross_margin)),
                "median": float(np.median(gross_margin)),
                "std": float(np.std(gross_margin)),
                "p5": float(np.percentile(gross_margin, 5)),
                "p95": float(np.percentile(gross_margin, 95))
            },
            "operating_margin": {
                "mean": float(np.mean(operating_margin)),
                "median": float(np.median(operating_margin)),
                "std": float(np.std(operating_margin)),
                "p5": float(np.percentile(operating_margin, 5)),
                "p95": float(np.percentile(operating_margin, 95))
            }
        },
        "metrics": computed_metrics,
        "data_used": {
            "periods_analyzed": len(df),
            "periods_list": periods_used,
            "time_period_requested": f"{num_periods} {period_type}" if num_periods else "all available",
            "note": note
        }
    }

    # Step 6: Generate human-readable explanation using LLM interpreter
    llm_explanation = await interpret_mc_results(question, mc_facts, client, interpreter_assistant_id)

    comprehensive_response = {
        "query_analysis": {
            "original_question": question,
            "nlp_parsing": nlp_result,
            "time_period_requested": f"{num_periods} {period_type}" if num_periods else "all available",
            "periods_analyzed": len(df),
            "periods_list": periods_used
        },
        "monte_carlo_simulation": {
            "num_simulations": NUM_SIMULATIONS,
            "simulation_method": "Monte Carlo with historical data-driven distributions",
            "historical_data_periods": len(df),
            "statement_chunks": statement_chunks,
            "data_quality": data_quality,
            "base_metrics": {
                "starting_revenue": float(base["revenue"]),
                "starting_cash": float(base["cash"]),
                "employee_count": base.get("employee_count", None)
            }
        },
        "analysis_results": {
            "question": question,
            "computed_answer": computed_answer,
            "metrics": computed_metrics,
            "llm_explanation": llm_explanation,
            "data_used": {
                "periods_analyzed": len(df),
                "periods_list": periods_used,
                "time_period_requested": f"{num_periods} {period_type}" if num_periods else "all available",
                "note": note
            }
        },
        "ratio_dashboard": ratio_dashboard,
        "anomaly_detection": anomaly_result,
        "raw_data": {
            "revenue_statistics": mc_facts["statistics"]["revenue"],
            "cash_statistics": mc_facts["statistics"]["cash"],
            "gross_margin_statistics": mc_facts["statistics"]["gross_margin"],
            "operating_margin_statistics": mc_facts["statistics"]["operating_margin"]
        },
        "monte_carlo_facts": mc_facts
    }

    # Store plot metadata
    plot_metadata = None
    if generate_plot:
        if "revenue" in metric or "revenue" in intent:
            comprehensive_response["plot_generation"] = {
                "status": "will_generate",
                "file": "revenue_distribution.png",
                "type": "revenue_distribution"
            }
            plot_metadata = {"type": "revenue", "sim_data": sim_data}
        elif "cash" in metric or "cash" in intent or "liquidity" in metric:
            comprehensive_response["plot_generation"] = {
                "status": "will_generate",
                "file": "cash_distribution.png",
                "type": "cash_distribution"
            }
            plot_metadata = {"type": "cash", "sim_data": sim_data}
        else:
            results_for_plot = {
                "starting_cash": base["cash"],
                "median_ending_cash": float(np.median(cash)),
                "p5_ending_cash": float(np.percentile(cash, 5)),
                "p10_ending_cash": float(np.percentile(cash, 10)),
                "p90_ending_cash": float(np.percentile(cash, 90)),
                "p95_ending_cash": float(np.percentile(cash, 95)),
                "probability_cash_negative": float(np.mean(cash < 0))
            }
            comprehensive_response["plot_generation"] = {
                "status": "will_generate",
                "file": "monte_carlo_bell_curve.png",
                "type": "comprehensive_bell_curve"
            }
            plot_metadata = {"type": "bell_curve", "results_for_plot": results_for_plot, "cash": cash}
    else:
        comprehensive_response["plot_generation"] = {"status": "skipped", "reason": "generate_plot=False"}

    fan_chart_files = []
    if generate_fan_charts and len(df) >= 1:
        try:
            multi_periods = run_multi_period_simulations(base, dists, num_periods=8, num_sims=2000)
            for metric_name in ["revenue", "cash"]:
                fan_file = plot_fan_chart(multi_periods, metric=metric_name)
                fan_chart_files.append(fan_file)
            comprehensive_response["fan_charts"] = {
                "status": "generated",
                "files": fan_chart_files,
                "num_periods": 8,
                "metrics": ["revenue", "cash"],
            }
            comprehensive_response["_multi_period_data"] = {
                "revenue_median": multi_periods["revenue"]["median"].tolist(),
                "revenue_p10": multi_periods["revenue"]["p10"].tolist(),
                "revenue_p90": multi_periods["revenue"]["p90"].tolist(),
                "cash_median": multi_periods["cash"]["median"].tolist(),
                "cash_p10": multi_periods["cash"]["p10"].tolist(),
                "cash_p90": multi_periods["cash"]["p90"].tolist(),
            }
        except Exception as e:
            comprehensive_response["fan_charts"] = {"status": "failed", "error": str(e)}
    else:
        comprehensive_response["fan_charts"] = {"status": "skipped"}

    comprehensive_response["_plot_metadata"] = plot_metadata

    return comprehensive_response


def answer_scenario_comparison(scenarios: list, num_sims: int = None) -> Dict:
    """
    Run scenario comparison synchronously.
    scenarios: list of { name: str, overrides: { param: value, ... } }
    """
    result = run_scenario_comparison(scenarios, num_sims)
    plot_path = result.get("plot")
    plot_base64 = None
    if plot_path and os.path.exists(plot_path):
        import base64
        with open(plot_path, "rb") as f:
            plot_base64 = base64.b64encode(f.read()).decode()
    return {
        "scenario_comparison": result,
        "plot": plot_base64,
    }


def answer_sensitivity_analysis(num_sims: int = None) -> Dict:
    """
    Run sensitivity analysis synchronously.
    Returns tornado data + base64-encoded plots for each metric.
    """
    df = load_financials(CSV_PATH)
    base = derive_historical_metrics(df)
    dists = build_distributions(base)
    result = run_sensitivity(base, dists, num_sims)

    plots = {}
    for metric in ["median_cash", "median_revenue", "prob_cash_negative"]:
        rel_path = plot_tornado(result, metric)
        abs_path = plot_tornado_absolute(result, metric)
        if rel_path and os.path.exists(rel_path):
            with open(rel_path, "rb") as f:
                plots[f"tornado_{metric}"] = base64.b64encode(f.read()).decode()
        if abs_path and os.path.exists(abs_path):
            with open(abs_path, "rb") as f:
                plots[f"tornado_absolute_{metric}"] = base64.b64encode(f.read()).decode()

    return {
        "sensitivity": result,
        "plots": plots,
    }


def answer_what_if(base_metrics: dict, overrides: dict, num_sims: int = None) -> Dict:
    result = what_if_from_session(base_metrics, overrides, num_sims)
    return result


def answer_question(question: str, generate_plot: bool = False, generate_fan_charts: bool = False) -> Dict:
    """
    Synchronous wrapper for answer_question_async.
    """
    if not API_KEY:
        raise ValueError("BACKBOARD_API_KEY not set in environment")
    client = BackboardClient(api_key=API_KEY)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        nlp_assistant_id = loop.run_until_complete(get_or_create_assistant(client))
        interpreter_assistant_id = loop.run_until_complete(get_or_create_interpreter_assistant(client))
        result = loop.run_until_complete(answer_question_async(question, client, nlp_assistant_id, interpreter_assistant_id, generate_plot, generate_fan_charts))
        return result
    finally:
        loop.close()
