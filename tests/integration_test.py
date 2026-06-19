#!/usr/bin/env python3
"""
Integration test for the SimuCFO Monte Carlo pipeline.
Tests the full data flow using synthetic financial data.
"""
import sys
import os
import json
import pytest
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'ml-simulator'))

from monte_carlo_simulations import (
    safe_float,
    derive_historical_metrics,
    build_distributions,
    run_simulation,
    run_monte_carlo_simulations,
)

import monte_carlo_simulations as mc_mod


@pytest.fixture
def sample_csv(tmp_path):
    """Create a synthetic financial CSV in the wide format the engine expects."""
    csv_path = tmp_path / "test_financials.csv"
    data = {
        "period": ["FY24-Q4", "FY25-Q1"],
        "revenue_total": [9500000, 10000000],
        "gross_profit": [3800000, 4000000],
        "operating_expenses_total": [2400000, 2500000],
        "net_income": [900000, 1000000],
        "cash_end_period": [1800000, 2000000],
        "cash_from_operations": [1400000, 1500000],
        "capital_expenditure": [-450000, -500000],
        "employee_count": [48, 50],
        "total_current_assets": [4800000, 5000000],
        "total_assets": [14000000, 15000000],
        "short_term_debt": [1900000, 2000000],
        "long_term_debt": [2800000, 3000000],
        "total_liabilities": [7500000, 8000000],
        "shareholders_equity": [6500000, 7000000],
    }
    df = pd.DataFrame(data)
    df.to_csv(csv_path, index=False)
    return str(csv_path)


class TestFullPipeline:
    def test_derive_historical_metrics(self, sample_csv):
        df = pd.read_csv(sample_csv)
        base = derive_historical_metrics(df)
        assert base is not None
        assert "revenue" in base
        assert base["revenue"] == 10000000
        assert base["cash"] == 2000000
        assert base["employee_count"] == 50

    def test_build_distributions(self, sample_csv):
        df = pd.read_csv(sample_csv)
        base = derive_historical_metrics(df)
        dists = build_distributions(base)
        assert "revenue_growth" in dists
        assert "gross_margin" in dists
        assert "opex_ratio" in dists
        assert dists["revenue_growth"]["mean"] is not None

    def test_run_single_simulation(self, sample_csv):
        df = pd.read_csv(sample_csv)
        base = derive_historical_metrics(df)
        dists = build_distributions(base)
        result = run_simulation(base, dists)
        assert result is not None
        assert "revenue" in result
        assert result["revenue"] >= 0
        assert "cash" in result
        assert "gross_margin" in result

    def test_run_multiple_simulations(self, sample_csv):
        df = pd.read_csv(sample_csv)
        base = derive_historical_metrics(df)
        dists = build_distributions(base)
        results = run_monte_carlo_simulations(base, dists, num_sims=100)
        assert results is not None
        assert len(results["cash"]) == 100
        assert len(results["revenue"]) == 100
        assert len(results["simulations"]) == 100
        assert "current_ratio" in results
        assert "debt_to_equity" in results
        assert "roe" in results
        assert "roa" in results

    def test_run_engine_with_csv(self, sample_csv, monkeypatch):
        monkeypatch.setattr(mc_mod, 'CSV_PATH', sample_csv)
        result = mc_mod.run_engine(return_cash_array=False)
        assert result is not None
        assert "starting_cash" in result
        assert "starting_revenue" in result
        assert "median_ending_cash" in result
        assert "probability_cash_negative" in result
        assert "expected_revenue_growth" in result
        assert "probability_should_hire" in result

    def test_pipeline_statistical_properties(self, sample_csv):
        df = pd.read_csv(sample_csv)
        base = derive_historical_metrics(df)
        dists = build_distributions(base)
        results = run_monte_carlo_simulations(base, dists, num_sims=1000)
        revenue_mean = np.mean(results["revenue"])
        assert abs(revenue_mean - 12100000) < 3000000
        assert np.all(results["revenue"] >= 0)
        p5 = np.percentile(results["revenue"], 5)
        p95 = np.percentile(results["revenue"], 95)
        assert p5 <= p95

    def test_all_key_metrics_present(self, sample_csv):
        df = pd.read_csv(sample_csv)
        base = derive_historical_metrics(df)
        dists = build_distributions(base)
        results = run_monte_carlo_simulations(base, dists, num_sims=50)
        expected = {"cash", "revenue", "gross_margin", "ebitda", "cash_flow"}
        for metric in expected:
            assert metric in results, f"Missing metric: {metric}"

    def test_current_ratio_computed(self, sample_csv):
        df = pd.read_csv(sample_csv)
        base = derive_historical_metrics(df)
        dists = build_distributions(base)
        results = run_monte_carlo_simulations(base, dists, num_sims=50)
        assert "current_ratio" in results
        assert len(results["current_ratio"]) == 50
        assert np.all(results["current_ratio"] > 0)

    def test_debt_to_equity_computed(self, sample_csv):
        df = pd.read_csv(sample_csv)
        base = derive_historical_metrics(df)
        dists = build_distributions(base)
        results = run_monte_carlo_simulations(base, dists, num_sims=50)
        assert "debt_to_equity" in results
        assert len(results["debt_to_equity"]) == 50

    def test_safe_float_in_pipeline(self, sample_csv):
        df = pd.read_csv(sample_csv)
        df["employee_count"] = df["employee_count"].apply(lambda x: "N/A")
        df.to_csv(sample_csv, index=False)
        df2 = pd.read_csv(sample_csv)
        base = derive_historical_metrics(df2)
        assert base["employee_count"] is None
