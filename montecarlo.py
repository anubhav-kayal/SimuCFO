"""
Main Entry Point for Monte Carlo Financial Analysis
====================================================
This script serves as the main entry point, importing functionality
from the modular NLP pipeline and Monte Carlo simulation modules.
"""

import sys
import json
import time

# Import from modular components
from nlp_pipeline import answer_question
from monte_carlo_simulations import run_engine, plot_monte_carlo_bell_curve

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
        # Default: run standard analysis
        results, cash_array = run_engine(return_cash_array=True)
        print("\n" + "=" * 70)
        print("STANDARD MONTE CARLO SIMULATION RESULTS")
        print("=" * 70)
        print(json.dumps({k: v for k, v in results.items() if k != "hiring_parameters"}, indent=2))
        plot_monte_carlo_bell_curve(results, cash_array)
    else:
        # Answer the question - optimized for speed
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
        print(f"\n⏱️  Analysis completed in {elapsed_time:.2f} seconds")
        print(f"📄 Full analysis saved to '{output_file}'")
