import plotly.express as px
import pandas as pd


def render_mcq_chart(question_label: str, series: pd.Series,
                     chart_type: str, colors: list, theme: dict):

    counts = series.dropna().value_counts().reset_index()
    counts.columns = ["option", "count"]

    if chart_type == "Bar":
        fig = px.bar(counts, x="option", y="count", color_discrete_sequence=colors)

    elif chart_type == "Pie":
        fig = px.pie(counts, names="option", values="count", color_discrete_sequence=colors)

    elif chart_type == "Doughnut":
        fig = px.pie(counts, names="option", values="count",
                     hole=0.45, color_discrete_sequence=colors)

    else:
        fig = px.bar(counts, x="option", y="count", color_discrete_sequence=colors)

    # ── FIXED VISIBILITY ─────────────────────────────
    fig.update_layout(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(color=theme["text"], size=13),
    legend=dict(
        font=dict(color=theme["text"]),
        title_font=dict(color=theme["text"])
    ),
    margin=dict(l=10, r=10, t=10, b=10),
)

    fig.update_xaxes(
        tickfont=dict(color=theme["text"]),
        title_font=dict(color=theme["text"])
    )

    fig.update_yaxes(
        tickfont=dict(color=theme["text"]),
        title_font=dict(color=theme["text"])
    )
    fig.update_traces(
    textfont=dict(color=theme["text"]),
    hoverlabel=dict(font=dict(color=theme["text"]))
)

    return fig