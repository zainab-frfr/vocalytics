import io
import math
import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import matplotlib.colors as mcolors
from PIL import Image


from charts.mcq_charts import render_mcq_chart
from charts.openended_charts import render_openended_chart


# ─────────────────────────────────────────────────────────────
# PNG builder
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

        q_label = question_texts.get(col, col)
        q_type = question_types.get(col, "open")
        chart_type = chart_selections.get(col, "Bar")
        series = responses[col].dropna()

        ax.set_title(q_label[:60], fontsize=10, color=theme["text"], pad=10)

        if q_type == "mcq":
            fig_plotly = render_mcq_chart(
                q_label,
                series,
                chart_type,
                theme["chart_colors"],
                theme
            )
            img = Image.open(io.BytesIO(fig_plotly.to_image(format="png")))
            ax.imshow(img)
        else:
            wc = render_openended_chart(
                q_label,
                series,
                chart_type,
                theme["accent"],
                as_image=True
            )
            if wc:
                ax.imshow(wc)

        ax.axis("off")

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, facecolor=theme["bg"])
    plt.close(fig)

    buf.seek(0)
    return buf.read()


# ─────────────────────────────────────────────────────────────
# UI
# ─────────────────────────────────────────────────────────────

def render(interview, responses, theme,
           chart_selections, question_types, question_texts):

    if responses.empty:
        st.warning("No completed responses found.")
        return

    q_cols = [c for c in responses.columns if c not in ("session_id", "respondent_name")]

    # ── TOP BAR ─────────────────────────────────────────────
    col1, col_spacer, col2 = st.columns([4, 0.3, 2])

    with col1:
        st.markdown(
            f"<p style='color:{theme['text']}; margin:0; font-weight:500'>"
            f"{len(responses)} respondents · {len(q_cols)} questions</p>",
            unsafe_allow_html=True
        )

    with col2:
        btn1, btn2 = st.columns(2, gap="small")

        with btn2:
            if st.button("Refresh", use_container_width=True):
                st.cache_data.clear()
                st.rerun()

        # with btn2:
        #     if st.button("Export PNG", use_container_width=True):
        #         with st.spinner("Exporting..."):
        #             png = build_png(
        #                 interview, responses, theme,
        #                 chart_selections, question_types, question_texts
        #             )
        #             st.download_button(
        #                 "Download PNG",
        #                 png,
        #                 file_name="dashboard.png",
        #                 mime="image/png",
        #                 use_container_width=True
        #             )

    st.divider()

    # ── CHARTS ─────────────────────────────────────────────
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
            color:{theme['text']};
        ">
        """, unsafe_allow_html=True)

        st.markdown(
            f"<div style='font-weight:600; color:{theme['text']}'>{q_label}</div>",
            unsafe_allow_html=True
        )

        if q_type == "mcq":
            fig = render_mcq_chart(q_label, series, chart_type, theme["chart_colors"], theme)
            st.plotly_chart(fig, use_container_width=True)
        else:
            render_openended_chart(q_label, series, chart_type, theme["accent"])

        st.markdown("</div>", unsafe_allow_html=True)