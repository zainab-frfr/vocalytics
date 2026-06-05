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


# ── Cache ─────────────────────────────────────────────────────
_cache: dict[str, tuple] = {}
TTL = 60 * 60 * 4 # 4 hours

def _get(key: str):
    entry = _cache.get(key)
    if entry and time.time() - entry[1] < TTL:
        return entry[0]
    return None

def _set(key: str, value):
    _cache[key] = (value, time.time())

def invalidate_all():
    """Wipe entire cache. Call after any write."""
    _cache.clear()


# ── Cached fetchers ───────────────────────────────────────────
def get_interviews(user_id: str) -> list:
    key = f"interviews:{user_id}"
    cached = _get(key)
    if cached is not None:
        return cached
    data = get_supabase().table("interviews") \
        .select("*").eq("creator_id", user_id).execute().data
    _set(key, data)
    return data

def get_interview(interview_id: str) -> dict:
    key = f"interview:{interview_id}"
    cached = _get(key)
    if cached is not None:
        return cached
    data = get_supabase().table("interviews") \
        .select("*").eq("id", interview_id).single().execute().data
    _set(key, data)
    return data

def get_interview_sessions(interview_id: str) -> list:
    key = f"sessions:{interview_id}"
    cached = _get(key)
    if cached is not None:
        return cached
    data = get_supabase().table("interview_sessions") \
        .select("*").eq("interview_id", interview_id).execute().data
    _set(key, data)
    return data

def get_session_responses(session_id: str) -> list:
    key = f"responses:{session_id}"
    cached = _get(key)
    if cached is not None:
        return cached
    data = get_supabase().table("responses") \
        .select("*").eq("session_id", session_id).execute().data
    _set(key, data)
    return data