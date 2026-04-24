import io
import math
import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from wordcloud import WordCloud
from PIL import Image
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from collections import Counter
import re
import re as _re

from charts.mcq_charts import render_mcq_chart
from charts.openended_charts import render_openended_chart


# ── CSS → matplotlib color fix ───────────────────────────────────────────────
def _to_mpl_color(css: str, fallback="#1a1a2e"):
    css = css.strip()
    if css.startswith("#") or not css.startswith("rgba"):
        return css

    m = _re.match(
        r"rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)",
        css,
    )
    if m:
        r, g, b, a = (float(x) for x in m.groups())
        return (r / 255, g / 255, b / 255, a)

    return fallback


STOPWORDS = {
    "the","and","that","this","with","have","from","they","will","been",
    "were","also","when","what","your","just","more","some","there","their",
    "about","which","would","could","should","into","than","then","these",
    "those","very","much","even","after","before","because","said","each",
}


# ── PNG helpers ──────────────────────────────────────────────────────────────

def _mcq_fig_for_export(series, chart_type, colors):
    counts = series.dropna().value_counts().reset_index()
    counts.columns = ["option", "count"]

    if chart_type == "Pie":
        fig = px.pie(counts, names="option", values="count", color_discrete_sequence=colors)
    elif chart_type == "Doughnut":
        fig = px.pie(counts, names="option", values="count", hole=0.45,
                     color_discrete_sequence=colors)
    else:
        fig = px.bar(counts, x="option", y="count", color_discrete_sequence=colors)

    fig.update_layout(
        paper_bgcolor="#1a1a2e",
        plot_bgcolor="#1a1a2e",
        font_color="#f0f0ff",
        margin=dict(l=10, r=10, t=10, b=10),
    )
    return fig


def _wordcloud_img(text, accent, bg_color):
    if not text.strip():
        return None

    wc = WordCloud(
        width=600,
        height=300,
        background_color=bg_color,
        colormap="Purples",
        stopwords=STOPWORDS,
        max_words=60,
    ).generate(text)

    fig, ax = plt.subplots(figsize=(6, 3), facecolor=bg_color)
    ax.imshow(wc)
    ax.axis("off")

    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", facecolor=bg_color)
    plt.close(fig)

    buf.seek(0)
    return Image.open(buf)


# ── PNG builder ──────────────────────────────────────────────────────────────

def build_png(interview, responses, theme,
              chart_selections, question_types, question_texts):

    q_cols = [c for c in responses.columns if c not in ("session_id", "respondent_name")]
    rows = math.ceil(len(q_cols) / 2)

    bg = _to_mpl_color(theme["bg"])
    card_bg = _to_mpl_color(theme["card_bg"])

    fig = plt.figure(figsize=(14, rows * 4 + 1), facecolor=bg)
    gs = gridspec.GridSpec(rows, 2, figure=fig)

    for i, col in enumerate(q_cols):
        ax = fig.add_subplot(gs[i])
        ax.set_facecolor(card_bg)

        q_label = question_texts.get(col, col)
        q_type = question_types.get(col, "open")
        chart_type = chart_selections.get(col, "Bar")
        series = responses[col].dropna()

        ax.set_title(q_label[:50], fontsize=9, color=theme["text"])

        if q_type == "mcq":
            fig_plotly = _mcq_fig_for_export(series, chart_type, theme["chart_colors"])
            img = Image.open(io.BytesIO(fig_plotly.to_image(format="png")))
            ax.imshow(img)
        else:
            wc = _wordcloud_img(
                " ".join(series.astype(str)),
                theme["accent"],
                _to_mpl_color(theme["bg"])
            )
            if wc:
                ax.imshow(wc)

        ax.axis("off")

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, facecolor=bg)
    plt.close(fig)

    buf.seek(0)
    return buf.read()


# ── UI RENDER FUNCTION ───────────────────────────────────────────────────────

def render(interview, responses, theme,
           chart_selections, question_types, question_texts):

    if responses.empty:
        st.warning("No completed responses found.")
        return

    q_cols = [c for c in responses.columns if c not in ("session_id", "respondent_name")]

    # ── TOP BAR (FIXED indentation + spacing) ───────────────────────────────
    col1, col_spacer, col2 = st.columns([4, 0.3, 2])

    with col1:
        st.markdown(
            f"<p style='color:{theme['subtext']}; margin:0'>"
            f"{len(responses)} respondents · {len(q_cols)} questions</p>",
            unsafe_allow_html=True
        )

    with col2:
        btn1, btn2 = st.columns(2, gap="small")

        with btn1:
            if st.button("Refresh", use_container_width=True):
                st.cache_data.clear()
                st.rerun()

        with btn2:
            if st.button("Export PNG", use_container_width=True):
                with st.spinner("Exporting..."):
                    png = build_png(
                        interview, responses, theme,
                        chart_selections, question_types, question_texts
                    )
                    st.download_button(
                        "Download PNG",
                        png,
                        file_name="dashboard.png",
                        mime="image/png",
                        use_container_width=True
                    )

    st.divider()

    # ── CHARTS ──────────────────────────────────────────────────────────────
    for col in q_cols:
        q_label = question_texts.get(col, col)
        q_type = question_types.get(col, "open")
        chart_type = chart_selections.get(col, "Bar")
        series = responses[col].dropna()

        st.markdown(f"""
        <div style="
            background:{theme['card_bg']};
            padding:20px;
            border-radius:12px;
            margin-bottom:20px;
        ">
        """, unsafe_allow_html=True)

        st.markdown(f"**{q_label}**")

        if q_type == "mcq":
            fig = render_mcq_chart(q_label, series, chart_type, theme["chart_colors"])
            st.plotly_chart(fig, use_container_width=True)
        else:
            render_openended_chart(q_label, series, chart_type, theme["accent"])

        st.markdown("</div>", unsafe_allow_html=True)