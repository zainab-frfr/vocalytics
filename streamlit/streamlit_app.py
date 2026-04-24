import json
import streamlit as st
from utils.supabase_client import get_interview, get_responses_pivoted, get_question_texts
from config.themes import THEMES, TEMPLATES
import templates.base_template as generic_tpl

st.set_page_config(page_title="Vocalytics Dashboard", layout="wide", page_icon="📊")

# ── URL params ────────────────────────────────────────────────────────────────
def _get(key, default):
    v = st.query_params.get(key, default)
    return v[0] if isinstance(v, list) else v

interview_id  = _get("interview_id",  None)
theme_name    = _get("theme",         "dark_purple")
template_name = _get("template",      "generic")
charts_raw    = _get("charts",        "{}")
types_raw     = _get("types",         "{}")

chart_selections: dict = json.loads(charts_raw) if charts_raw else {}
question_types:   dict = json.loads(types_raw)  if types_raw  else {}

# ── Theme CSS ─────────────────────────────────────────────────────────────────
theme = THEMES.get(theme_name, THEMES["dark_purple"])

st.markdown(f"""
<style>
  .stApp {{
    background-color: {theme['bg']};
    color: {theme['text']};
  }}

  .stApp, p, span, div, label {{
    color: #f0f0ff !important;
  }}

  [data-testid="stMarkdownContainer"] {{
    color: #f0f0ff !important;
  }}

  header {{ visibility: hidden; }}
  #MainMenu {{ visibility: hidden; }}
  footer {{ visibility: hidden; }}

  .block-container {{
    max-width: 1200px;
    margin: auto;
    padding-top: 2rem;
    padding-bottom: 2rem;
  }}

  h1,h2,h3,h4 {{
    color: {theme['text']} !important;
  }}

  hr {{
    border-color: rgba(255,255,255,0.08);
  }}

  div[data-testid="stHorizontalBlock"] {{
    align-items: stretch;
  }}

  div.stButton > button {{
    background-color: transparent;
    color: {theme['text']};
    border: 1px solid rgba(255,255,255,0.25);
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 13px;
    transition: all 0.2s ease;
  }}

  div.stButton > button:hover {{
    background-color: rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.5);
  }}

  div.stButton > button:focus {{
    outline: none;
    box-shadow: none;
  }}
</style>
""", unsafe_allow_html=True)

# ── Guard ─────────────────────────────────────────────────────────────────────
if not interview_id:
    st.error("No interview ID provided. Open this dashboard from Vocalytics.")
    st.stop()

# ── Load data ────────────────────────────────────────────────────────────────
@st.cache_data(ttl=300)
def load_data(iid: str):
    return (
        get_interview(iid),
        get_responses_pivoted(iid),
        get_question_texts(iid),
    )

interview, responses, question_texts = load_data(interview_id)

# ── Header card ───────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="padding:20px 24px;border-radius:12px;
            background:{theme['card_bg']['css']};
            margin-bottom:20px;">
  <h2 style="margin:0">{interview.get('title','Dashboard')}</h2>
  {f"<p style='color:{theme['subtext']};margin:6px 0 0'>{interview['description']}</p>"
   if interview.get('description') else ""}
</div>
""", unsafe_allow_html=True)

# ── Render template ───────────────────────────────────────────────────────────
TEMPLATE_MAP = {
    "generic": generic_tpl,
}

renderer = TEMPLATE_MAP.get(template_name, generic_tpl)
renderer.render(
    interview,
    responses,
    theme,
    chart_selections,
    question_types,
    question_texts
)