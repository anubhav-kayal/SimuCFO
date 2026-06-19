import pytest
import sys
import os
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from monte_carlo_simulations import safe_float, truncated_normal


class TestSafeFloat:
    def test_numeric_string(self):
        assert safe_float("1000") == 1000.0

    def test_float_string(self):
        assert safe_float("99.5") == 99.5

    def test_negative_value(self):
        assert safe_float("-50") == -50.0

    def test_na_string(self):
        assert safe_float("N/A") is None

    def test_empty_string(self):
        assert safe_float("") is None

    def test_none(self):
        assert safe_float(None) is None

    def test_pandas_na(self):
        import pandas as pd
        assert safe_float(pd.NA) is None

    def test_number_with_commas(self):
        assert safe_float("1,234,567") == 1234567.0

    def test_invalid_string(self):
        assert safe_float("not_a_number") is None

    def test_zero(self):
        assert safe_float(0) == 0.0


class TestTruncatedNormal:
    def test_returns_correct_shape(self):
        result = truncated_normal(100, 10, 50, 150, size=100)
        assert len(result) == 100

    def test_values_within_bounds(self):
        result = truncated_normal(100, 10, 50, 150, size=1000)
        assert np.all(result >= 50)
        assert np.all(result <= 150)

    def test_zero_std(self):
        result = truncated_normal(100, 0, 50, 150, size=10)
        assert np.allclose(result, 100)

    def test_scalar_return(self):
        result = truncated_normal(100, 10, 50, 150, size=1)
        assert len(result) == 1

    def test_mean_approximation(self):
        result = truncated_normal(100, 5, 80, 120, size=5000)
        assert abs(np.mean(result) - 100) < 5

    def test_large_std_clipping(self):
        result = truncated_normal(0, 100, -10, 10, size=1000)
        assert np.all(result >= -10)
        assert np.all(result <= 10)
