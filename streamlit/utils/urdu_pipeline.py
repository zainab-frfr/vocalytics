import os
import re
import pandas as pd
from rapidfuzz import process, utils as fuzz_utils
from groq import Groq

# ── Client (lazy init) ────────────────────────────────────────────────────────

_groq_client = None

def _get_groq():
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _groq_client

# ── Detection ─────────────────────────────────────────────────────────────────

def is_urdu(text: str) -> bool:
    """True if text contains Urdu/Arabic script characters."""
    if not text or pd.isna(text):
        return False
    return bool(re.search(r'[\u0600-\u06FF]', str(text)))

def _looks_numeric(text: str) -> bool:
    """True if text is a plain number or Urdu numeral word."""
    URDU_NUMBERS = {
        "ایک","ون","دو","ٹو","تین","تھری","چار","فور",
        "پانچ","فائیو","چھ","چھے","سکس","سات","ساتھ",
        "سیون","آٹھ","ایٹ","نو","نائن","بیس","تیس","چالیس",
        "پچاس","اکیس","بائیس","تیئیس","چوبیس","پچیس",
    }
    t = str(text).strip()
    if re.match(r'^\d+(\.\d+)?$', t):
        return True
    match = process.extractOne(
        t, URDU_NUMBERS,
        processor=fuzz_utils.default_process,
        score_cutoff=85
    )
    return match is not None

# ── Column-level type inference ───────────────────────────────────────────────

def infer_column_need(series: pd.Series) -> str:
    """
    Returns 'numeric', 'short_text', or 'long_text' for a column.
    Used to decide which translation strategy to apply.
    """
    filled = series.dropna().astype(str).tolist()
    filled = [v for v in filled if v.strip() and v.lower() != "null"]
    if not filled:
        return "long_text"

    numeric_count = sum(1 for v in filled if _looks_numeric(v))
    short_count   = sum(1 for v in filled if len(v.split()) <= 3)

    ratio_numeric = numeric_count / len(filled)
    ratio_short   = short_count   / len(filled)

    if ratio_numeric >= 0.6:
        return "numeric"
    if ratio_short >= 0.6:
        return "short_text"
    return "long_text"

# ── Translation functions ─────────────────────────────────────────────────────

def _extract_number_llm(raw: str, scale_hint: str = "") -> str | None:
    """Ask LLM to extract a number from Urdu text."""
    hint = f" (scale: {scale_hint})" if scale_hint else ""
    prompt = (
        f"Extract ONLY the numeric value{hint} from this text: '{raw}'. "
        f"Reply with ONLY a number or NULL."
    )
    try:
        resp = _get_groq().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0,
            max_tokens=10,
        )
        ans = resp.choices[0].message.content.strip()
        return ans if re.match(r'^\d+(\.\d+)?$', ans) else None
    except Exception:
        return None


def _translate_llm(raw: str) -> str | None:
    """Translate Urdu text to English using LLM."""
    prompt = (
        f"Translate this Urdu text to English. "
        f"Reply with ONLY the English translation, nothing else:\n\n{raw}"
    )
    try:
        resp = _get_groq().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0,
            max_tokens=200,
        )
        result = resp.choices[0].message.content.strip().strip('"\'')
        return result if result and result.lower() != "null" else None
    except Exception:
        return None


def _translate_batch_llm(texts: list[str]) -> list[str]:
    """
    Translate a batch of short Urdu texts in a single LLM call.
    More efficient than one call per cell for short/MCQ answers.
    """
    numbered = "\n".join(f"{i+1}. {t}" for i, t in enumerate(texts))
    prompt = (
        f"Translate each of the following Urdu texts to English. "
        f"Reply with ONLY a numbered list matching the input. "
        f"No extra text:\n\n{numbered}"
    )
    try:
        resp = _get_groq().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0,
            max_tokens=500,
        )
        lines = resp.choices[0].message.content.strip().split("\n")
        results = []
        for line in lines:
            # Strip leading "1. ", "2. " etc.
            cleaned = re.sub(r'^\d+\.\s*', '', line).strip()
            results.append(cleaned if cleaned else None)
        # Pad if LLM returned fewer lines than input
        while len(results) < len(texts):
            results.append(None)
        return results[:len(texts)]
    except Exception:
        return [None] * len(texts)

# ── Column-level processing ───────────────────────────────────────────────────

def process_column(series: pd.Series, col_type: str) -> pd.Series:
    """
    Apply Urdu-to-English conversion to one column based on its inferred type.
    Only processes cells that contain Urdu script.
    """
    result = series.copy().astype(object)

    urdu_mask = series.apply(
        lambda x: is_urdu(str(x)) if pd.notna(x) and str(x).strip() else False
    )

    if not urdu_mask.any():
        return result  # nothing to do

    urdu_indices = series[urdu_mask].index
    urdu_values  = series[urdu_mask].astype(str).tolist()

    if col_type == "numeric":
        # Extract number from each Urdu cell individually
        for idx, raw in zip(urdu_indices, urdu_values):
            # Try plain digit extraction first
            nums = re.findall(r'\d+', raw)
            if nums:
                result.at[idx] = nums[0]
            else:
                extracted = _extract_number_llm(raw)
                result.at[idx] = extracted if extracted else raw

    elif col_type == "short_text":
        # Batch translate for efficiency
        translated = _translate_batch_llm(urdu_values)
        for idx, val in zip(urdu_indices, translated):
            result.at[idx] = val if val else result.at[idx]

    else:  # long_text — one call per cell for quality
        for idx, raw in zip(urdu_indices, urdu_values):
            translated = _translate_llm(raw)
            if translated:
                result.at[idx] = translated

    return result

# ── Main entry point ──────────────────────────────────────────────────────────

def translate_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Runtime Urdu-to-English pipeline for any Vocalytics response dataframe.
    
    Input:  pivoted responses df (rows=sessions, cols=question_ids)
    Output: same shape df with Urdu cells translated to English
    """
    if df.empty:
        return df

    df = df.copy()
    skip_cols = {"session_id", "respondent_name"}
    q_cols = [c for c in df.columns if c not in skip_cols]

    for col in q_cols:
        series   = df[col]
        col_type = infer_column_need(series)

        # Skip column entirely if no Urdu detected
        has_urdu = series.dropna().astype(str).apply(
            lambda x: is_urdu(x)
        ).any()

        if not has_urdu:
            continue

        df[col] = process_column(series, col_type)

    return df