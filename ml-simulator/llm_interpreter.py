import json
import asyncio
from typing import Dict
from backboard import BackboardClient
from backboard.exceptions import BackboardAPIError


INTERPRETER_SYSTEM_PROMPT = """
You are a CFO-level financial analyst.

You are given:
1. A user question
2. Structured Monte Carlo simulation results (facts only)

Your job:
- Explain results in clear, human language
- Highlight downside risk, upside potential, and uncertainty
- Reference probabilities and percentiles explicitly
- Provide concrete, actionable recommendations
- Do NOT invent numbers
- Do NOT recompute statistics
- Do NOT mention Monte Carlo unless necessary
"""


async def get_or_create_interpreter_assistant(client: BackboardClient):
    """
    Create the interpreter assistant once.
    In production, you should persist assistant_id.
    """
    try:
        assistant = await client.create_assistant(
            name="Monte Carlo Results Interpreter",
            system_prompt=INTERPRETER_SYSTEM_PROMPT
        )
        return assistant.assistant_id
    except Exception as e:
        raise RuntimeError("Failed to create interpreter assistant") from e


async def interpret_mc_results(
    question: str,
    mc_facts: Dict,
    client: BackboardClient,
    assistant_id: str
) -> str:
    """
    Converts Monte Carlo factual output into a human-readable explanation
    with insights and recommendations.
    """

    user_prompt = f"""
USER QUESTION:
{question}

MONTE CARLO RESULTS (FACTS ONLY):
{json.dumps(mc_facts, indent=2)}

INSTRUCTIONS:
- Answer the user's question directly
- Summarize key findings in 3–5 bullet points
- Then provide a short 'Recommendation' section
- Be concise, executive-friendly, and precise
- Format the output clearly with sections
"""

    # Create a fresh thread per query
    thread = await client.create_thread(assistant_id)

    response = await client.add_message(
        thread_id=thread.thread_id,
        content=user_prompt,
        llm_provider="openai",
        model_name="gpt-4o"
    )

    return response.content.strip()