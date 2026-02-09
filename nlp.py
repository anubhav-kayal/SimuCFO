import json
import asyncio
from backboard import BackboardClient
from backboard.exceptions import BackboardAPIError

API_KEY = "espr_v98ne5cw6JLXhlLiFQNJrRlEdqOeWRbKiFaAJQ4L7oc"

SYSTEM_PROMPT = """
You are an intelligent NLP parser for business and financial queries.

Your task:
1. Understand the user's intent
2. Identify the primary metric being asked about
3. Extract relevant parameters 
4. Return a structured, machine-readable JSON object

Return ONLY valid JSON.
Do NOT include explanations, markdown, or extra text.

Output format:

{{
  "intent": "<string>",
  "metric": "<string>",
  
  "parameters": {{
    "<parameter_name>": <value | null>
  }}
}}

Rules:
- intent must be snake_case
- metric must be a single primary metric (e.g. revenue, cost, profit, cash_flow)

- parameters must include ONLY values explicitly stated or clearly implied
- Use null for missing values
- Do not invent data
"""

def extract_json(raw_output: str) -> dict:
    raw_output = raw_output.strip()

    if raw_output.startswith("```"):
        raw_output = raw_output.replace("```json", "").replace("```", "").strip()

    return json.loads(raw_output)


async def get_or_create_assistant(client: BackboardClient):
    """
    Create the assistant once.
    In production, you should persist assistant_id.
    """
    try:
        assistant = await client.create_assistant(
            name="Finance NLP Parser",
            system_prompt=SYSTEM_PROMPT
        )
        return assistant.assistant_id
    except BackboardAPIError as e:
        raise RuntimeError("Failed to create assistant (timeout or network issue)") from e


async def run_nlp_pipeline(user_query: str, assistant_id: str, client: BackboardClient):
    # Create a fresh thread per query (cheap + fast)
    thread = await client.create_thread(assistant_id)

    response = await client.add_message(
        thread_id=thread.thread_id,
        content=user_query,
        llm_provider="openai",
        model_name="gpt-4o"
    )

    raw_output = response.content.strip()

    try:
        parsed = extract_json(raw_output)
    except Exception:
        print("RAW MODEL OUTPUT:\n", raw_output)
        raise ValueError("Model did not return valid JSON")

    # Normalization
    if parsed.get("intent") == "assess_risk" and parsed.get("metric"):
        parsed["intent"] = f'{parsed["metric"]}_risk_analysis'

    # if parsed.get("time_horizon_months") is None:
    #     parsed["time_horizon_months"] = 3

    if "parameters" not in parsed:
        parsed["parameters"] = {}

    return parsed


async def main():
    client = BackboardClient(api_key=API_KEY)

    print("Initializing assistant (one-time)...")
    assistant_id = await get_or_create_assistant(client)
    print("Assistant ready.\n")

    while True:
        query = input("Enter user query (or 'exit'): ")
        if query.lower() == "exit":
            break

        try:
            result = await run_nlp_pipeline(query, assistant_id, client)
            print("\nExtracted JSON:")
            print(json.dumps(result, indent=2))
            print()
        except Exception as e:
            print("Error:", str(e))


if __name__ == "__main__":
    asyncio.run(main())