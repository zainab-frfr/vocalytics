import io
import math
import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from PIL import Image

from charts.mcq_charts import render_mcq_chart
from charts.openended_charts import render_openended_chart


# ─────────────────────────────────────────────────────────────
# PNG builder (unchanged)
# ─────────────────────────────────────────────────────────────

def build_png(interview, responses, theme,
              chart_selections, question_types, question_texts):

    q_cols = [c for c in responses.columns if c not in ("session_id", "respondent_name")]
    rows = math.ceil(len(q_cols) / 2)

    fig = plt.figure(figsize=(14, rows * 4 + 1), facecolor=theme["bg"])
    gs = gridspec.GridSpec(rows, 2, figure=fig)

    for i, col in enumerate(q_cols):
        ax = fig.add_subplot(gs[i])
        ax.set_facecolor(theme["card_bg"]["mpl"])

        q_label    = question_texts.get(col, col)
        q_type     = question_types.get(col, "open")
        chart_type = chart_selections.get(col, "Bar")
        series     = responses[col].dropna()

        ax.set_title(q_label[:60], fontsize=10, color=theme["text"], pad=10)

        if q_type == "mcq":
            fig_plotly = render_mcq_chart(q_label, series, chart_type, theme["chart_colors"], theme)
            img = Image.open(io.BytesIO(fig_plotly.to_image(format="png")))
            ax.imshow(img)
        else:
            wc = render_openended_chart(q_label, series, chart_type, theme["accent"], as_image=True)
            if wc:
                ax.imshow(wc)

        ax.axis("off")

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, facecolor=theme["bg"])
    plt.close(fig)
    buf.seek(0)
    return buf.read()


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

COLS_PER_ROW = 2   # ← change to 3 if you have many small charts


def _card_css(theme: dict) -> str:
    """Inject CSS for metric tiles and chart card wrappers."""
    bg  = theme["card_bg"]["css"] if isinstance(theme["card_bg"], dict) else theme["card_bg"]
    sub = theme.get("subtext", "rgba(240,240,255,0.45)")
    return f"""
<style>
  /* KPI tiles */
  .voc-kpi {{
    background:{bg};
    border-radius:12px;
    padding:16px 20px;
    text-align:center;
  }}
  .voc-kpi .val {{
    font-size:1.9rem;
    font-weight:700;
    color:{theme["text"]};
    line-height:1.1;
  }}
  .voc-kpi .lbl {{
    font-size:0.68rem;
    color:{sub};
    text-transform:uppercase;
    letter-spacing:.08em;
    margin-top:4px;
  }}

  /* Chart card wrapper — use flex column so title is always on top */
  .voc-card {{
    background:{bg};
    border-radius:12px;
    padding:16px 16px 8px;
    display:flex;
    flex-direction:column;
  }}
  .voc-card-title {{
    font-size:0.73rem;
    font-weight:600;
    color:{sub};
    text-transform:uppercase;
    letter-spacing:.07em;
    margin-bottom:6px;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    /* Ensure it stays above whatever Streamlit renders next */
    order:0;
    flex-shrink:0;
  }}

  /* Remove plotly chart bottom margin */
  .stPlotlyChart {{ margin-bottom:0 !important; }}

  /* Tighten column gutters */
  div[data-testid="column"] {{ padding: 0 5px !important; }}
</style>
"""


def _truncate(text: str, n: int = 60) -> str:
    return text if len(text) <= n else text[:n].rstrip() + "…"


# ─────────────────────────────────────────────────────────────
# UI
# ─────────────────────────────────────────────────────────────

def render(interview, responses, theme,
           chart_selections, question_types, question_texts):

    if responses.empty:
        st.warning("No completed responses found.")
        return

    # Inject CSS
    st.markdown(_card_css(theme), unsafe_allow_html=True)

    q_cols = [c for c in responses.columns if c not in ("session_id", "respondent_name")]

    # ── TOP BAR ──────────────────────────────────────────────────────────────
    top_left, _, top_right = st.columns([4, 0.3, 2])

    with top_left:
        st.markdown(
            f"<p style='color:{theme['text']};margin:0;font-weight:500'>"
            f"{len(responses)} respondents · {len(q_cols)} questions</p>",
            unsafe_allow_html=True,
        )

    with top_right:
        _, btn_col = st.columns(2, gap="small")
        with btn_col:
            if st.button("Refresh", use_container_width=True):
                st.cache_data.clear()
                st.rerun()

    st.divider()

    # ── KPI STRIP ────────────────────────────────────────────────────────────
    kpi_cols = st.columns(4, gap="small")
    mcq_count  = sum(1 for c in q_cols if question_types.get(c) == "mcq")
    open_count = len(q_cols) - mcq_count
    total_ans  = sum(responses[c].notna().sum() for c in q_cols)

    kpis = [
        (str(len(responses)),  "Respondents"),
        (str(len(q_cols)),     "Questions"),
        (str(total_ans),       "Total Answers"),
        (f"{mcq_count} / {open_count}", "MCQ / Open"),
    ]
    for col, (val, label) in zip(kpi_cols, kpis):
        with col:
            st.markdown(
                f'<div class="voc-kpi">'
                f'<div class="val">{val}</div>'
                f'<div class="lbl">{label}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    st.markdown("<div style='height:16px'></div>", unsafe_allow_html=True)

    # ── CHART GRID ───────────────────────────────────────────────────────────
    # Chunk questions into rows of COLS_PER_ROW
    rows = [q_cols[i:i + COLS_PER_ROW] for i in range(0, len(q_cols), COLS_PER_ROW)]

    for row_qs in rows:
        grid = st.columns(len(row_qs), gap="small")

        for col_widget, q_col in zip(grid, row_qs):
            q_label    = question_texts.get(q_col, q_col)
            q_type     = question_types.get(q_col, "open")
            chart_type = chart_selections.get(q_col, "Bar")
            series     = responses[q_col].dropna()

            with col_widget:
                # ── FIX: emit title BEFORE opening the card div, then wrap
                # both together so the label is always visually above the chart.
                # We use a single self-contained HTML block for the card header,
                # then let Streamlit render the chart widget beneath it.
                st.markdown(
                    f'<div class="voc-card-title">{_truncate(q_label)}</div>',
                    unsafe_allow_html=True,
                )

                if series.empty:
                    st.markdown(
                        '<p style="font-size:12px;color:rgba(255,255,255,.3);'
                        'text-align:center;padding:50px 0">No data</p>',
                        unsafe_allow_html=True,
                    )
                elif q_type == "mcq":
                    fig = render_mcq_chart(
                        q_label, series, chart_type,
                        theme["chart_colors"], theme,
                    )
                    # Compact height so cards stay uniform
                    fig.update_layout(height=260, margin=dict(l=8, r=8, t=4, b=8))
                    st.plotly_chart(fig, use_container_width=True,
                                    config={"displayModeBar": False})
                else:
                    render_openended_chart(q_label, series, chart_type, theme["accent"])

        # Subtle row divider (skip after last row)
        if row_qs is not rows[-1]:
            st.markdown(
                "<hr style='border:none;border-top:1px solid rgba(255,255,255,.07);margin:6px 0'>",
                unsafe_allow_html=True,
            )