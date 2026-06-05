# db.py
import os
import time
from supabase import create_client, Client

_client: Client | None = None

def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"],
        )
    return _client

def _reset_client():
    """Force a fresh client on next call — fixes stale HTTP/2 connections."""
    global _client
    _client = None


# ── Cache ─────────────────────────────────────────────────────
_cache: dict[str, tuple] = {}
TTL = 60 * 60  * 4# 1 hour

def _get(key: str):
    entry = _cache.get(key)
    if entry and time.time() - entry[1] < TTL:
        return entry[0]
    return None

def _set(key: str, value):
    _cache[key] = (value, time.time())

def invalidate_all():
    _cache.clear()


# ── Safe execute helper ───────────────────────────────────────
def _execute_with_retry(query_fn):
    try:
        return query_fn()
    except Exception as e:
        error_str = str(e)
        error_type = type(e).__name__
        # Catch all stale connection errors
        if any(keyword in error_str or keyword in error_type for keyword in [
            "RemoteProtocolError",
            "Server disconnected",
            "WriteError",
            "EOF occurred",
            "ReadError",
            "ConnectError",
            "PoolTimeout",
        ]):
            _reset_client()
            return query_fn()  # retry once with fresh client
        raise

# ── Cached fetchers ───────────────────────────────────────────
def get_interviews(user_id: str) -> list:
    key = f"interviews:{user_id}"
    cached = _get(key)
    if cached is not None:
        return cached
    data = _execute_with_retry(
        lambda: get_supabase().table("interviews")
            .select("*").eq("creator_id", user_id).order("created_at", desc=True).execute().data
    )
    _set(key, data)
    return data

def get_interview(interview_id: str) -> dict:
    key = f"interview:{interview_id}"
    cached = _get(key)
    if cached is not None:
        return cached
    data = _execute_with_retry(
        lambda: get_supabase().table("interviews")
            .select("*").eq("id", interview_id).single().execute().data
    )
    _set(key, data)
    return data

def get_interview_sessions(interview_id: str) -> list:
    key = f"sessions:{interview_id}"
    cached = _get(key)
    if cached is not None:
        return cached
    data = _execute_with_retry(
        lambda: get_supabase().table("interview_sessions")
            .select("*").eq("interview_id", interview_id).execute().data
    )
    _set(key, data)
    return data

def get_session_responses(session_id: str) -> list:
    key = f"responses:{session_id}"
    cached = _get(key)
    if cached is not None:
        return cached
    data = _execute_with_retry(
        lambda: get_supabase().table("responses")
            .select("*").eq("session_id", session_id).execute().data
    )
    _set(key, data)
    return data