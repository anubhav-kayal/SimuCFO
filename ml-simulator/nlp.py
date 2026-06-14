"""
DEPRECATED — Consolidated into nlp_pipeline.py.

All functionality (rule-based + Backboard API fallback) now lives in nlp_pipeline.py.
Import from nlp_pipeline instead:

    from nlp_pipeline import parse_question, parse_question_with_fallback, run_nlp_api, get_or_create_assistant, API_KEY

This file will be removed in a future cleanup.
"""

import os
import warnings
warnings.warn(
    "nlp.py is deprecated. Use nlp_pipeline.py instead.",
    DeprecationWarning,
    stacklevel=2
)

from nlp_pipeline import (
    API_KEY,
    extract_json,
    get_or_create_assistant,
    run_nlp_api,
    parse_question,
    parse_question_with_fallback,
)
