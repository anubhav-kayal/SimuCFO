import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from nlp_pipeline import extract_json, parse_question


class TestExtractJson:
    def test_plain_json(self):
        result = extract_json('{"key": "value"}')
        assert result == {"key": "value"}

    def test_json_with_markdown_fence(self):
        result = extract_json('```json\n{"key": "value"}\n```')
        assert result == {"key": "value"}

    def test_nested_json(self):
        result = extract_json('{"outer": {"inner": 42}}')
        assert result == {"outer": {"inner": 42}}

    def test_array_in_json(self):
        result = extract_json('{"items": [1, 2, 3]}')
        assert result == {"items": [1, 2, 3]}

    def test_malformed_json_raises(self):
        with pytest.raises(Exception):
            extract_json("{invalid json}")


class TestParseQuestion:
    def test_revenue_question(self):
        result = parse_question("What is the probability of revenue decline next quarter?")
        assert result["category"] != "non_financial"

    def test_cash_question(self):
        result = parse_question("What is my cash runway?")
        assert result["category"] != "non_financial"

    def test_non_financial_question(self):
        result = parse_question("What is the weather today?")
        assert result["category"] == "non_financial"
        assert result["nlp_analysis"]["confidence"] == 0.0

    def test_threshold_question(self):
        result = parse_question("What is the probability of revenue falls below 5 million?")
        assert result["category"] != "non_financial"
        assert result["parameters"].get("threshold") == 5.0

    def test_growth_question(self):
        result = parse_question("What is the expected revenue growth next year?")
        assert result["category"] != "non_financial"

    def test_margin_question(self):
        result = parse_question("Are my margins under pressure?")
        assert result["category"] != "non_financial"

    def test_employee_question(self):
        result = parse_question("Should we hire more employees?")
        assert result["category"] != "non_financial"

    def test_empty_question(self):
        result = parse_question("")
        assert "category" in result
