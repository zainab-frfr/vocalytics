import streamlit as st
import pandas as pd
import plotly.express as px
from wordcloud import WordCloud
import matplotlib.pyplot as plt
import re
from collections import Counter


STOPWORDS = {
    "the","and","that","this","with","have","from","they","will","been",
    "were","also","when","what","your","just","more","some","there","their",
    "about","which","would","could","should","into","than","then","these",
}


def render_openended_chart(question_label: str, series: pd.Series,
                            chart_type: str, accent: str, as_image=False):

    text_list = series.dropna().astype(str).tolist()
    combined = " ".join(text_list)

    if chart_type == "Word Cloud":

        if not combined.strip():
            if not as_image:
                st.info("No text responses.")
            return None

        wc = WordCloud(
            width=700,
            height=280,
            background_color=None,
            mode="RGBA",
            colormap="Purples",
            stopwords=STOPWORDS,
            max_words=80
        ).generate(combined)

        fig, ax = plt.subplots(figsize=(7, 3))
        ax.imshow(wc, interpolation="bilinear")
        ax.axis("off")
        fig.patch.set_alpha(0)

        if as_image:
            import io
            from PIL import Image
            buf = io.BytesIO()
            fig.savefig(buf, format="png", bbox_inches="tight")
            plt.close(fig)
            buf.seek(0)
            return Image.open(buf)

        st.pyplot(fig, clear_figure=True)
        return None

    elif chart_type == "Table View":
        df = pd.DataFrame({"Response": text_list})
        st.dataframe(df, use_container_width=True)

    elif chart_type == "Keyword Frequency":
        words = re.findall(r'\b[a-zA-Z]{4,}\b', combined.lower())
        words = [w for w in words if w not in STOPWORDS]

        if not words:
            st.info("Not enough text.")
            return

        freq = Counter(words).most_common(20)
        df = pd.DataFrame(freq, columns=["Keyword", "Count"])

        fig = px.bar(df, x="Count", y="Keyword", orientation="h",
                     color_discrete_sequence=[accent])

        fig.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#f0f0ff")
        )

        fig.update_xaxes(tickfont=dict(color="#f0f0ff"))
        fig.update_yaxes(tickfont=dict(color="#f0f0ff"))

        st.plotly_chart(fig, use_container_width=True)