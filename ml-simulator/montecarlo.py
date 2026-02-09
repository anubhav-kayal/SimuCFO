"""
Main Entry Point for Monte Carlo Financial Analysis
====================================================
This script connects the NLP pipeline (nlp.py) with Monte Carlo simulations
(monte_carlo_simulations.py) to provide seamless financial question answering.

ARCHITECTURE:
-------------
1. nlp.py: Handles natural language parsing using Backboard API
   - Parses user questions to extract intent, metric, and parameters
   
2. monte_carlo_simulations.py: Contains all Monte Carlo simulation logic
   - Data loading (load_financials)
   - Historical metrics derivation (derive_historical_metrics)
   - Distribution building (build_distributions)
   - Simulation execution (run_monte_carlo_simulations, run_engine)
   - Visualization (plot_monte_carlo_bell_curve, plot_revenue_distribution, plot_cash_distribution)
   
3. montecarlo.py: Integration layer that connects both modules
   - Uses nlp.py to parse questions
   - Uses monte_carlo_simulations.py to run simulations
   - Generates answers based on parsed intent and simulation results
"""

import sys
import json
import time
import asyncio
import numpy as np
import re
from typing import Dict
from llm_interpreter import interpret_mc_results
# Set matplotlib to non-interactive backend to avoid blocking JSON output
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt

# Import NLP pipeline for question parsing (nlp.py)
import nlp
from backboard import BackboardClient

# Import LLM interpreter for generating human-readable explanations
from llm_interpreter import interpret_mc_results, get_or_create_interpreter_assistant

# Import Monte Carlo simulation functions (monte_carlo_simulations.py)
# All simulation logic is delegated to monte_carlo_simulations.py
from monte_carlo_simulations import (
    load_financials,              # Load CSV financial data
    derive_historical_metrics,    # Calculate historical statistics
    build_distributions,          # Build probability distributions
    run_monte_carlo_simulations,  # Run batch simulations
    run_engine,                   # Complete engine wrapper
    plot_monte_carlo_bell_curve,  # Cash distribution visualization
    plot_revenue_distribution,     # Revenue distribution visualization
    plot_cash_distribution,        # Cash distribution visualization
    NUM_SIMULATIONS,              # Number of simulations to run
    CSV_PATH                    # Path to financial data CSV
)

# =====================================================
# INTEGRATION LAYER: Connect NLP + Monte Carlo
# =====================================================

async def answer_question_async(question: str, client: BackboardClient, nlp_assistant_id: str, interpreter_assistant_id: str, generate_plot: bool = False) -> Dict:
    """
    Answer a financial question by:
    1. Parsing question using NLP pipeline (nlp.py)
    2. Running Monte Carlo simulations (monte_carlo_simulations.py)
    3. Collecting all simulation facts
    4. Generating human-readable explanation using LLM interpreter (llm_interpreter.py)
    
    This function integrates nlp.py, monte_carlo_simulations.py, and llm_interpreter.py seamlessly.
    """
    # Step 1: Parse question using NLP pipeline (nlp.py)
    nlp_result = await nlp.run_nlp_pipeline(question, nlp_assistant_id, client)
    
    # Step 2: Extract time period from question and NLP parsing (dynamic extraction)
    num_periods = None
    period_type = None
    question_lower = question.lower()
    parameters = nlp_result.get("parameters", {})
    
    # Extract number and period type from question
    # Look for patterns like "4 quarters", "last 4 quarters", "3 months", "2 years", etc.
    period_patterns = [
        (r'(\d+)\s*(?:quarters?|q)', 'quarters'),
        (r'(\d+)\s*(?:months?|m)', 'months'),
        (r'(\d+)\s*(?:years?|y)', 'years'),
        (r'last\s+(\d+)', 'quarters'),  # "last 4" usually means quarters
        (r'(\d+)\s*(?:periods?|period)', 'periods')
    ]
    
    for pattern, ptype in period_patterns:
        match = re.search(pattern, question_lower)
        if match:
            num_periods = int(match.group(1))
            period_type = ptype
            break
    
    # Also check NLP parameters
    if num_periods is None:
        if "time_period" in parameters:
            time_period = str(parameters["time_period"]).lower()
            # Extract number from time_period string
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
    # All simulation logic is handled by monte_carlo_simulations.py
    df_full = load_financials(CSV_PATH)  # From monte_carlo_simulations.py
    
    # Filter data based on requested time period
    if num_periods is not None:
        # Take the last N periods (most recent data)
        df = df_full.tail(num_periods).copy()
        periods_used = df["period"].tolist() if "period" in df.columns else [f"Period {i+1}" for i in range(len(df))]
        note = f"Analysis based on last {num_periods} {period_type or 'periods'}: {', '.join(periods_used)}"
    else:
        df = df_full.copy()
        periods_used = df["period"].tolist() if "period" in df.columns else [f"Period {i+1}" for i in range(len(df))]
        note = f"Analysis based on all available data: {len(df)} periods"
    
    base = derive_historical_metrics(df)  # From monte_carlo_simulations.py
    dists = build_distributions(base)  # From monte_carlo_simulations.py
    sim_data = run_monte_carlo_simulations(base, dists)  # From monte_carlo_simulations.py
    
    # Step 4: Extract metrics from NLP parsing result
    intent = nlp_result.get("intent", "").lower()
    metric = nlp_result.get("metric", "").lower()
    
    # Step 4: Generate answer based on intent and metric
    revenue = sim_data["revenue"]
    cash = sim_data["cash"]
    gross_margin = sim_data["gross_margin"]
    operating_margin = sim_data["operating_margin"]
    cash_flow = sim_data["cash_flow"]
    
    # Compute all metrics dynamically (no hardcoded reasoning - LLM will generate it)
    computed_metrics = {}
    computed_answer = {}
    
    # Calculate all relevant metrics based on question type
    revenue_cv = float(np.std(revenue) / np.mean(revenue)) if np.mean(revenue) > 0 else 0
    cash_cv = float(np.std(cash) / np.abs(np.mean(cash))) if np.mean(cash) != 0 else 0
    prob_cash_negative = float(np.mean(cash < 0))
    prob_revenue_decline = float(np.mean(revenue < base["revenue"]))
    
    # Historical volatility calculation
    historical_revenues = df["revenue_total"].values if len(df) > 1 else [base["revenue"]]
    historical_cv = float(np.std(historical_revenues) / np.mean(historical_revenues)) if len(historical_revenues) > 1 and np.mean(historical_revenues) > 0 else 0.0
    
    # Route based on metric and intent from NLP parsing - compute facts only
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
            # General revenue analysis
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
            # General cash/liquidity analysis
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
            # General margin analysis
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
        # General comprehensive analysis - compute all metrics
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
    
    # Step 5: Prepare Monte Carlo facts for LLM interpreter (no hardcoded reasoning - all facts only)
    mc_facts = {
        "question": question,
        "query_context": {
            "intent": nlp_result.get("intent"),
            "metric": nlp_result.get("metric"),
            "parameters": nlp_result.get("parameters", {}),
            "time_period_requested": f"{num_periods} {period_type}" if num_periods else "all available",
            "periods_analyzed": len(df),
            "periods_list": periods_used
        },
        "simulation_metadata": {
            "num_simulations": NUM_SIMULATIONS,
            "simulation_method": "Monte Carlo with historical data-driven distributions",
            "historical_data_periods": len(df),
            "base_metrics": {
                "starting_revenue": float(base["revenue"]),
                "starting_cash": float(base["cash"]),
                "employee_count": base.get("employee_count", None)
            }
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
    
    # Step 6: Generate human-readable explanation using LLM interpreter (llm_interpreter.py)
    llm_explanation = await interpret_mc_results(question, mc_facts, client, interpreter_assistant_id)
    
    # Build comprehensive response with LLM-generated explanation
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
            "llm_explanation": llm_explanation,  # Human-readable explanation from LLM (no hardcoded reasoning)
            "data_used": {
                "periods_analyzed": len(df),
                "periods_list": periods_used,
                "time_period_requested": f"{num_periods} {period_type}" if num_periods else "all available",
                "note": note
            }
        },
        "raw_data": {
            "revenue_statistics": mc_facts["statistics"]["revenue"],
            "cash_statistics": mc_facts["statistics"]["cash"],
            "gross_margin_statistics": mc_facts["statistics"]["gross_margin"],
            "operating_margin_statistics": mc_facts["statistics"]["operating_margin"]
        },
        "monte_carlo_facts": mc_facts  # Complete facts passed to LLM
    }
    
    # Store plot metadata (not the actual data) for later generation
    # Plot will be generated AFTER JSON output to avoid blocking
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
    
    # Store plot metadata in response for later use (not serialized to JSON)
    comprehensive_response["_plot_metadata"] = plot_metadata
    
    return comprehensive_response


def answer_question(question: str, generate_plot: bool = False) -> Dict:
    """
    Synchronous wrapper for answer_question_async.
    
    This function connects:
    - nlp.py: For parsing user questions
    - monte_carlo_simulations.py: For running simulations and generating results
    - llm_interpreter.py: For generating human-readable explanations
    
    Returns comprehensive analysis JSON with NLP parsing, Monte Carlo simulation data, and LLM-generated explanations.
    """
    client = BackboardClient(api_key=nlp.API_KEY)
    
    # Run async function (handles NLP parsing, Monte Carlo simulations, and LLM interpretation)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        # Initialize NLP assistant (nlp.py)
        nlp_assistant_id = loop.run_until_complete(nlp.get_or_create_assistant(client))
        # Initialize LLM interpreter assistant (llm_interpreter.py)
        interpreter_assistant_id = loop.run_until_complete(get_or_create_interpreter_assistant(client))
        # Run integration function (uses nlp.py, monte_carlo_simulations.py, and llm_interpreter.py)
        result = loop.run_until_complete(answer_question_async(question, client, nlp_assistant_id, interpreter_assistant_id, generate_plot))
        return result
    finally:
        loop.close()

# =====================================================
# MAIN - QUESTION ANSWERING INTERFACE
# =====================================================

if __name__ == "__main__":
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
        # Default: run standard analysis using monte_carlo_simulations.py
        # This uses run_engine() from monte_carlo_simulations.py directly
        results, cash_array = run_engine(return_cash_array=True)  # From monte_carlo_simulations.py
        print("\n" + "=" * 70)
        print("STANDARD MONTE CARLO SIMULATION RESULTS")
        print("=" * 70)
        print(json.dumps({k: v for k, v in results.items() if k != "hiring_parameters"}, indent=2))
        plot_monte_carlo_bell_curve(results, cash_array)  # From monte_carlo_simulations.py
    else:
        # Answer the question with plotting enabled
        start_time = time.time()
        
        comprehensive_answer = answer_question(question, generate_plot=True)  # Enable plot generation
        
        # Extract analysis results
        analysis_results = comprehensive_answer.get("analysis_results", {})
        llm_explanation = analysis_results.get("llm_explanation", "")
        computed_answer = analysis_results.get("computed_answer", {})
        data_used = analysis_results.get("data_used", {})
        
        # Save structured interpretation (English text) to .txt file
        interpretation_file = "financial_analysis_interpretation.txt"
        with open(interpretation_file, 'w', encoding='utf-8') as f:
            f.write("=" * 70 + "\n")
            f.write("FINANCIAL ANALYSIS - STRUCTURED INTERPRETATION\n")
            f.write("=" * 70 + "\n\n")
            f.write(f"Question: {question}\n\n")
            f.write(llm_explanation)
            f.write("\n\n" + "=" * 70 + "\n")
            f.write("DATA CONTEXT\n")
            f.write("=" * 70 + "\n")
            if data_used:
                f.write(f"Periods Analyzed: {data_used.get('periods_analyzed', 'N/A')}\n")
                f.write(f"Time Period: {data_used.get('time_period_requested', 'N/A')}\n")
                f.write(f"Note: {data_used.get('note', 'N/A')}\n")
            f.write("=" * 70 + "\n")
        
        # Save computed metrics to .json file (only essential computed parameters)
        metrics_file = "computed_metrics.json"
        # Only include the computed_answer - the essential metrics needed
        metrics_data = computed_answer.copy() if computed_answer else {}
        
        # Add metrics if they exist and are relevant
        if analysis_results.get("metrics"):
            metrics_data.update(analysis_results.get("metrics", {}))
        
        with open(metrics_file, 'w', encoding='utf-8') as f:
            json.dump(metrics_data, f, indent=2, default=str)
        
        # Display summary to console
        print("\n" + "=" * 70)
        print("FINANCIAL ANALYSIS - STRUCTURED INTERPRETATION")
        print("=" * 70)
        print("\n" + llm_explanation)
        print("\n" + "=" * 70)
        
        # Display computed metrics summary
        if computed_answer:
            print("\n" + "=" * 70)
            print("COMPUTED METRICS (Summary)")
            print("=" * 70)
            print(json.dumps(computed_answer, indent=2, default=str))
            print("=" * 70)
        
        # Display data context
        if data_used:
            print("\n" + "=" * 70)
            print("DATA CONTEXT")
            print("=" * 70)
            print(f"Periods Analyzed: {data_used.get('periods_analyzed', 'N/A')}")
            print(f"Time Period: {data_used.get('time_period_requested', 'N/A')}")
            print(f"Note: {data_used.get('note', 'N/A')}")
            print("=" * 70)
        
        # Save full comprehensive JSON to file (remove plot metadata before saving)
        output_file = "monte_carlo_analysis.json"
        json_to_save = comprehensive_answer.copy()
        json_to_save.pop("_plot_metadata", None)  # Remove non-serializable plot metadata
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(json_to_save, f, indent=2, default=str)
        
        elapsed_time = time.time() - start_time
        print(f"\n⏱️  Analysis completed in {elapsed_time:.2f} seconds")
        print(f"📄 Structured interpretation saved to '{interpretation_file}'")
        print(f"📊 Computed metrics saved to '{metrics_file}'")
        print(f"📋 Full analysis saved to '{output_file}'")
        
        # Generate plot AFTER JSON output (to avoid blocking)
        plot_metadata = comprehensive_answer.get("_plot_metadata")
        plot_info = comprehensive_answer.get("plot_generation", {})
        
        if plot_metadata and plot_info.get("status") == "will_generate":
            try:
                plot_type = plot_metadata.get("type")
                if plot_type == "revenue":
                    plot_revenue_distribution(plot_metadata.get("sim_data"))
                    plt.close('all')  # Close figure to free memory
                    print(f"📊 Graph saved as 'revenue_distribution.png'")
                elif plot_type == "cash":
                    plot_cash_distribution(plot_metadata.get("sim_data"))
                    plt.close('all')  # Close figure to free memory
                    print(f"📊 Graph saved as 'cash_distribution.png'")
                elif plot_type == "bell_curve":
                    plot_monte_carlo_bell_curve(plot_metadata.get("results_for_plot"), plot_metadata.get("cash"))
                    plt.close('all')  # Close figure to free memory
                    print(f"📊 Graph saved as 'monte_carlo_bell_curve.png'")
            except Exception as e:
                print(f"\n⚠️  Could not generate plot: {e}")
                import traceback
                traceback.print_exc()
                plt.close('all')  # Ensure figures are closed even on error
        elif plot_info.get("status") == "skipped":
            pass  # Plot generation was skipped
        elif plot_info.get("status") == "failed":
            print(f"⚠️  Plot generation failed: {plot_info.get('error', 'Unknown error')}")
        