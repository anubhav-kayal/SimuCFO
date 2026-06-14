"""
CLI Entry Point for Monte Carlo Financial Analysis
===================================================
Thin CLI wrapper around mc_router. Run directly or from backend:

    python ml-simulator/montecarlo.py "What is the probability of negative cash?"
"""

import sys
import json
import time
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from mc_router import answer_question
from monte_carlo_simulations import run_engine, plot_monte_carlo_bell_curve


if __name__ == "__main__":
    if len(sys.argv) > 1:
        question = " ".join(sys.argv[1:])
    else:
        print("\n" + "=" * 70)
        print("MONTE CARLO FINANCIAL ANALYSIS - QUESTION ANSWERING SYSTEM")
        print("=" * 70)
        question = input("\nYour question: ").strip()

    if question.lower() in ['exit', 'quit', '']:
        results, cash_array = run_engine(return_cash_array=True)
        print("\n" + "=" * 70)
        print("STANDARD MONTE CARLO SIMULATION RESULTS")
        print("=" * 70)
        print(json.dumps({k: v for k, v in results.items() if k != "hiring_parameters"}, indent=2))
        plot_monte_carlo_bell_curve(results, cash_array)
    else:
        start_time = time.time()

        comprehensive_answer = answer_question(question, generate_plot=True)

        analysis_results = comprehensive_answer.get("analysis_results", {})
        llm_explanation = analysis_results.get("llm_explanation", "")
        computed_answer = analysis_results.get("computed_answer", {})
        data_used = analysis_results.get("data_used", {})

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

        metrics_file = "computed_metrics.json"
        metrics_data = computed_answer.copy() if computed_answer else {}
        if analysis_results.get("metrics"):
            metrics_data.update(analysis_results.get("metrics", {}))
        with open(metrics_file, 'w', encoding='utf-8') as f:
            json.dump(metrics_data, f, indent=2, default=str)

        print("\n" + "=" * 70)
        print("FINANCIAL ANALYSIS - STRUCTURED INTERPRETATION")
        print("=" * 70)
        print("\n" + llm_explanation)
        print("\n" + "=" * 70)

        if computed_answer:
            print("\n" + "=" * 70)
            print("COMPUTED METRICS (Summary)")
            print("=" * 70)
            print(json.dumps(computed_answer, indent=2, default=str))
            print("=" * 70)

        if data_used:
            print("\n" + "=" * 70)
            print("DATA CONTEXT")
            print("=" * 70)
            print(f"Periods Analyzed: {data_used.get('periods_analyzed', 'N/A')}")
            print(f"Time Period: {data_used.get('time_period_requested', 'N/A')}")
            print(f"Note: {data_used.get('note', 'N/A')}")
            print("=" * 70)

        output_file = "monte_carlo_analysis.json"
        json_to_save = comprehensive_answer.copy()
        json_to_save.pop("_plot_metadata", None)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(json_to_save, f, indent=2, default=str)

        elapsed_time = time.time() - start_time
        print(f"\nAnalysis completed in {elapsed_time:.2f} seconds")
        print(f"Interpretation saved to '{interpretation_file}'")
        print(f"Metrics saved to '{metrics_file}'")
        print(f"Full analysis saved to '{output_file}'")

        plot_metadata = comprehensive_answer.get("_plot_metadata")
        plot_info = comprehensive_answer.get("plot_generation", {})

        if plot_metadata and plot_info.get("status") == "will_generate":
            try:
                plot_type = plot_metadata.get("type")
                if plot_type == "revenue":
                    from monte_carlo_simulations import plot_revenue_distribution
                    plot_revenue_distribution(plot_metadata.get("sim_data"))
                    plt.close('all')
                    print(f"Graph saved as 'revenue_distribution.png'")
                elif plot_type == "cash":
                    from monte_carlo_simulations import plot_cash_distribution
                    plot_cash_distribution(plot_metadata.get("sim_data"))
                    plt.close('all')
                    print(f"Graph saved as 'cash_distribution.png'")
                elif plot_type == "bell_curve":
                    plot_monte_carlo_bell_curve(plot_metadata.get("results_for_plot"), plot_metadata.get("cash"))
                    plt.close('all')
                    print(f"Graph saved as 'monte_carlo_bell_curve.png'")
            except Exception as e:
                print(f"Could not generate plot: {e}")
                import traceback
                traceback.print_exc()
                plt.close('all')
        elif plot_info.get("status") == "failed":
            print(f"Plot generation failed: {plot_info.get('error', 'Unknown error')}")
