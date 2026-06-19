import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'extractors'))
from pdfProcessor import (
    detect_statement_type,
    detect_period,
    validate_extracted_data,
    score_data_quality,
    get_metric_statement_type,
)

class TestDetectStatementType:
    def test_income_statement(self):
        text = "Profit & Loss Statement\nRevenue: 1000\nCost of Goods Sold: 500\nNet Income: 200"
        assert detect_statement_type(text) == "income_statement"

    def test_balance_sheet(self):
        text = "Balance Sheet\nTotal Assets: 5000\nLiabilities: 2000\nShareholders Equity: 3000"
        assert detect_statement_type(text) == "balance_sheet"

    def test_cash_flow(self):
        text = "Cash Flow Statement\nOperating Cash Flow: 500\nInvesting Activities: -200"
        assert detect_statement_type(text) == "cash_flow"

    def test_unknown_short_text(self):
        assert detect_statement_type("Hello") == "unknown"

    def test_unknown_empty(self):
        assert detect_statement_type("") == "unknown"


class TestDetectPeriod:
    def test_quarterly_format(self):
        text = "Financial results for Q1 FY25"
        result = detect_period(text)
        assert "FY25" in result or "FY" in result

    def test_month_date_format(self):
        text = "Period ending 31 March 2025"
        result = detect_period(text)
        assert "2025" in result or "FY" in result

    def test_unknown_period(self):
        assert detect_period("") == "Unknown Period"
        assert detect_period(None) == "Unknown Period"


class TestValidateExtractedData:
    def test_valid_data(self):
        data = {"period": "FY25-Q1", "revenue_total": 1000, "net_income": 200, "total_assets": 5000}
        assert validate_extracted_data(data) is True

    def test_missing_period(self):
        assert validate_extracted_data({"revenue_total": 1000}) is False

    def test_all_zeros(self):
        data = {"period": "FY25-Q1", "revenue_total": 0, "net_income": 0, "total_assets": 0}
        assert validate_extracted_data(data) is False

    def test_empty_data(self):
        assert validate_extracted_data({}) is False

    def test_none_data(self):
        assert validate_extracted_data(None) is False


class TestGetMetricStatementType:
    def test_known_metric(self):
        result = get_metric_statement_type("revenue_total")
        assert result in ("income_statement", "unknown")

    def test_unknown_metric(self):
        assert get_metric_statement_type("nonexistent_metric") == "unknown"


class TestScoreDataQuality:
    def test_high_quality_structured(self):
        data = {"period": "FY25-Q1", "revenue_total": 1000, "net_income": 200}
        result = score_data_quality(data, is_scanned=False, has_structured_tables=True)
        assert result["revenue_total"]["score"] >= 0.8
        assert result["revenue_total"]["label"] == "high"

    def test_scanned_penalty(self):
        data = {"period": "FY25-Q1", "revenue_total": 1000, "net_income": 200}
        result = score_data_quality(data, is_scanned=True, has_structured_tables=False)
        assert result["revenue_total"]["score"] < 1.0
        assert "ocr_scanned" in result["revenue_total"]["flags"]

    def test_zero_value_deduction(self):
        data = {"period": "FY25-Q1", "revenue_total": 0, "net_income": 200, "total_assets": 5000}
        result = score_data_quality(data, has_structured_tables=True)
        assert result["revenue_total"]["score"] <= 0.3
        assert "zero_value" in result["revenue_total"]["flags"]

    def test_negative_cash_flag(self):
        data = {"period": "FY25-Q1", "cash_end_period": -500, "revenue_total": 1000, "net_income": 200, "total_assets": 5000}
        result = score_data_quality(data, has_structured_tables=True)
        assert "negative_cash" in result["cash_end_period"]["flags"]

    def test_exceeds_total_assets(self):
        data = {"period": "FY25-Q1", "total_current_assets": 10000, "total_assets": 5000, "revenue_total": 1000, "net_income": 200}
        result = score_data_quality(data, has_structured_tables=True)
        assert result["total_current_assets"]["score"] <= 0.3
        assert "exceeds_total_assets" in result["total_current_assets"]["flags"]

    def test_missing_value(self):
        data = {"period": "FY25-Q1", "revenue_total": None, "net_income": 200, "total_assets": 5000}
        result = score_data_quality(data, has_structured_tables=True)
        assert result["revenue_total"]["score"] == 0.0
        assert "missing" in result["revenue_total"]["flags"]
