import streamlit as st
import pandas as pd
import plotly.express as px
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from collections import Counter
import re

STOPWORDS = {
    "the","and","that","this","with","have","from","they","will","been",
    "were","also","when","what","your","just","more","some","there","their",
    "about","which","would","could","should","into","than","then","these",
    "those","very","much","even","after","before","because","said","each",
    "other","over","such","both","through","itself","between","while",
}

def render_openended_chart(question_label: str, series: pd.Series,
                            chart_type: str, accent: str):
    text_list = series.dropna().astype(str).tolist()
    combined  = " ".join(text_list)

    if chart_type == "Word Cloud":
        if combined.strip():
            wc = WordCloud(
                width=700, height=280,
                background_color=None, mode="RGBA",
                colormap="Purples",
                stopwords=STOPWORDS,
                max_words=80,
                prefer_horizontal=0.85,
            ).generate(combined)
            fig, ax = plt.subplots(figsize=(7, 2.8))
            ax.imshow(wc, interpolation="bilinear")
            ax.axis("off")
            fig.patch.set_alpha(0)
            st.pyplot(fig, clear_figure=True)
        else:
            st.info("No text responses to build a word cloud.")

    elif chart_type == "Table View":
        df = pd.DataFrame({"Response": text_list})
        df.index = df.index + 1
        st.dataframe(df, use_container_width=True)

    elif chart_type == "Keyword Frequency":
        words = re.findall(r'\b[a-zA-Z]{4,}\b', combined.lower())
        words = [w for w in words if w not in STOPWORDS]
        if not words:
            st.info("Not enough text to extract keywords.")
            return
        freq  = Counter(words).most_common(20)
        df    = pd.DataFrame(freq, columns=["Keyword", "Count"])
        fig   = px.bar(df, x="Count", y="Keyword", orientation="h",
                       color_discrete_sequence=[accent])
        fig.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font_color="#f0f0ff",
            margin=dict(l=0, r=0, t=8, b=0),
            yaxis=dict(autorange="reversed"),
            xaxis=dict(showgrid=True, gridcolor="rgba(255,255,255,0.06)"),
        )
        st.plotly_chart(fig, use_container_width=True)