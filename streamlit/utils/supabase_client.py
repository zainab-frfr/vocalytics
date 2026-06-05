import os
import pandas as pd
import streamlit as st
from supabase import create_client
from dotenv import load_dotenv
from utils.urdu_pipeline import translate_dataframe

load_dotenv(dotenv_path=".env.local")

# ─────────────────────────────────────────────────────────────
# Client — one instance, never recreated
# ─────────────────────────────────────────────────────────────

_client = None

def get_client():
    global _client
    if _client is None:
        _client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"]
        )
    return _client


# ─────────────────────────────────────────────────────────────
# Cached fetchers
# ─────────────────────────────────────────────────────────────

@st.cache_data(ttl=300, show_spinner=False)
def get_interview(interview_id: str) -> dict:
    res = get_client().table("interviews") \
        .select("id, title, description, questions") \
        .eq("id", interview_id).single().execute()
    return res.data


@st.cache_data(ttl=300, show_spinner=False)
def get_question_texts(interview_id: str) -> dict:
    """
    Fetch question_id → question_text mapping from the first completed session.
    Cached so it doesn't re-query on every rerender.
    """
    client = get_client()

    session = client.table("interview_sessions") \
        .select("id") \
        .eq("interview_id", interview_id) \
        .eq("status", "completed") \
        .limit(1).execute().data

    if not session:
        return {}

    responses = client.table("responses") \
        .select("question_id, question_text") \
        .eq("session_id", session[0]["id"]).execute().data

    return {r["question_id"]: r["question_text"] for r in responses}


@st.cache_data(ttl=300, show_spinner=False)
def get_responses_pivoted(interview_id: str) -> pd.DataFrame:
    """
    Fetches sessions + responses in two queries, pivots, then runs the
    Urdu → English pipeline exactly once. Result is cached for 5 min,
    so LLM calls only fire on first load or after TTL expiry.
    """
    client = get_client()

    # ── 1. Sessions ──────────────────────────────────────────
    sessions = client.table("interview_sessions") \
        .select("id, respondent_name") \
        .eq("interview_id", interview_id) \
        .eq("status", "completed") \
        .execute().data

    if not sessions:
        return pd.DataFrame()

    session_ids   = [s["id"] for s in sessions]
    session_names = {s["id"]: s["respondent_name"] for s in sessions}

    # ── 2. Responses (single query, all sessions at once) ────
    responses = client.table("responses") \
        .select("session_id, question_id, question_text, response") \
        .in_("session_id", session_ids) \
        .execute().data

    if not responses:
        return pd.DataFrame()

    # ── 3. Pivot ─────────────────────────────────────────────
    df = pd.DataFrame(responses)

    pivoted = df.pivot_table(
        index="session_id",
        columns="question_id",
        values="response",
        aggfunc=lambda x: " ".join(str(v) for v in x if pd.notna(v))
    ).reset_index()

    pivoted.columns.name = None  # drop the "question_id" axis label
    pivoted["respondent_name"] = pivoted["session_id"].map(session_names)

    # ── 4. Urdu → English (runs once, result is cached) ──────
    print(">>> BEFORE translate:", pivoted.head(2).to_dict())
    pivoted = translate_dataframe(pivoted)
    print(">>> AFTER translate:", pivoted.head(2).to_dict())
    return pivoted


# ─────────────────────────────────────────────────────────────
# Cache invalidation helper (called by the Refresh button)
# ─────────────────────────────────────────────────────────────

def clear_interview_cache():
    """Call this when the user clicks Refresh to force a re-fetch."""
    get_interview.clear()
    get_question_texts.clear()
    get_responses_pivoted.clear()


    