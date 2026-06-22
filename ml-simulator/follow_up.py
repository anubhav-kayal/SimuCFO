"""
Follow-up Question Handler
==========================
Lightweight re-analysis for follow-up questions. Uses existing MC analysis
data and LLM re-interpretation with conversation context — no re-simulation.
"""

import sys
import os
import json
import asyncio

from nlp_pipeline import parse_question_with_fallback, get_or_create_assistant, API_KEY
from backboard import BackboardClient
from llm_interpreter import interpret_mc_results, get_or_create_interpreter_assistant, INTERPRETER_SYSTEM_PROMPT
from mc_router import answer_question_async

FOLLOW_UP_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(FOLLOW_UP_DIR, "follow_up_input.json")
OUTPUT_FILE = os.path.join(FOLLOW_UP_DIR, "follow_up_output.json")


def build_follow_up_prompt(new_question: str, conversation: list, mc_facts: dict) -> str:
    history_lines = []
    for msg in conversation[-6:]:  # last 6 for context window
        role = msg.get("role", "user")
        content = msg.get("content", "")
        history_lines.append(f"[{role.upper()}]: {content}")

    history_text = "\n".join(history_lines) if history_lines else "No prior conversation."

    return f"""
You are a CFO-level financial analyst continuing a conversation.

CONVERSATION HISTORY (last 6 turns):
{history_text}

EXISTING ANALYSIS DATA (facts only):
{json.dumps(mc_facts, indent=2)}

NEW QUESTION:
{new_question}

INSTRUCTIONS:
- Answer the new question directly, building on the existing analysis
- Reference data from the existing analysis where relevant
- If the question asks for something not in the data, say so clearly
- Be concise, executive-friendly, and precise
- Format clearly with sections if appropriate
"""


async def handle_follow_up():
    if not os.path.exists(INPUT_FILE):
        print(json.dumps({"error": "No input file found"}))
        sys.exit(1)

    with open(INPUT_FILE) as f:
        input_data = json.load(f)

    new_question = input_data.get("new_question", "")
    conversation = input_data.get("conversation", [])
    mc_facts = input_data.get("mc_facts", {})
    generate_plot = input_data.get("generate_plot", False)
    generate_fan_charts = input_data.get("generate_fan_charts", False)

    if not new_question:
        print(json.dumps({"error": "No question provided"}))
        sys.exit(1)

    if not API_KEY:
        print(json.dumps({"error": "BACKBOARD_API_KEY not set"}))
        sys.exit(1)

    client = BackboardClient(api_key=API_KEY)

    nlp_assistant_id = await get_or_create_assistant(client)
    interpreter_assistant_id = await get_or_create_interpreter_assistant(client)

    # If we have existing MC results, use LLM re-interpretation directly
    if mc_facts:
        follow_up_prompt = build_follow_up_prompt(new_question, conversation, mc_facts)
        llm_response = await interpret_mc_results(new_question, mc_facts, client, interpreter_assistant_id)

        result = {
            "question": new_question,
            "answer": mc_facts.get("computed_results", {}),
            "reasoning": llm_response,
            "statistics": mc_facts.get("statistics", {}),
        }
    else:
        # No existing data — run a full new analysis
        response = await answer_question_async(
            new_question, client,
            nlp_assistant_id, interpreter_assistant_id,
            generate_plot, generate_fan_charts
        )
        result = {
            "question": new_question,
            "answer": response.get("analysis_results", {}).get("computed_answer", {}),
            "reasoning": response.get("analysis_results", {}).get("llm_explanation", ""),
            "statistics": response.get("monte_carlo_facts", {}).get("statistics", {}),
        }

    output = {
        "result": result,
        "conversation": conversation + [
            {"role": "user", "content": new_question},
            {"role": "assistant", "content": result["reasoning"]},
        ],
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2, default=str)

    print(json.dumps(output, indent=2, default=str))


if __name__ == "__main__":
    asyncio.run(handle_follow_up())
