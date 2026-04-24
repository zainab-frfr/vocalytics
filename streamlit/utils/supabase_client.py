import os
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv
from utils.urdu_pipeline import translate_dataframe   # ← ADD THIS

load_dotenv(dotenv_path=".env.local")

_client = None

def get_client():
    global _client
    if _client is None:
        _client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"]
        )
    return _client

def get_interview(interview_id: str) -> dict:
    res = get_client().table("interviews") \
        .select("id, title, description, questions") \
        .eq("id", interview_id).single().execute()
    return res.data

def get_responses_pivoted(interview_id: str) -> pd.DataFrame:
    client = get_client()

    sessions = client.table("interview_sessions") \
        .select("id, respondent_name") \
        .eq("interview_id", interview_id) \
        .eq("status", "completed") \
        .execute().data

    if not sessions:
        return pd.DataFrame()

    session_ids   = [s["id"] for s in sessions]
    session_names = {s["id"]: s["respondent_name"] for s in sessions}

    responses = client.table("responses") \
        .select("session_id, question_id, question_text, response") \
        .in_("session_id", session_ids) \
        .execute().data

    if not responses:
        return pd.DataFrame()

    df = pd.DataFrame(responses)

    pivoted = df.pivot_table(
        index="session_id",
        columns="question_id",
        values="response",
        aggfunc=lambda x: " ".join(str(v) for v in x if pd.notna(v))
    ).reset_index()

    pivoted["respondent_name"] = pivoted["session_id"].map(session_names)

    # ── Urdu → English conversion ─────────────────────────────────────────────
    pivoted = translate_dataframe(pivoted)               # ← ADD THIS LINE
    # ─────────────────────────────────────────────────────────────────────────

    return pivoted

def get_question_texts(interview_id: str) -> dict:
    client = get_client()
    session = client.table("interview_sessions") \
        .select("id").eq("interview_id", interview_id) \
        .eq("status", "completed").limit(1).execute().data
    if not session:
        return {}
    responses = client.table("responses") \
        .select("question_id, question_text") \
        .eq("session_id", session[0]["id"]).execute().data
    return {r["question_id"]: r["question_text"] for r in responses}