import plotly.express as px
import pandas as pd

def render_mcq_chart(question_label: str, series: pd.Series, chart_type: str, colors: list):
    counts = series.dropna().value_counts().reset_index()
    counts.columns = ["option", "count"]

    if chart_type == "Bar":
        fig = px.bar(counts, x="option", y="count",
                     color_discrete_sequence=colors)
    elif chart_type == "Pie":
        fig = px.pie(counts, names="option", values="count",
                     color_discrete_sequence=colors)
    elif chart_type == "Doughnut":
        fig = px.pie(counts, names="option", values="count",
                     hole=0.45, color_discrete_sequence=colors)
    elif chart_type == "Frequency Distribution":
        fig = px.bar(counts, x="option", y="count",
                     color_discrete_sequence=colors)
        fig.update_layout(bargap=0.05)
    else:
        fig = px.bar(counts, x="option", y="count",
                     color_discrete_sequence=colors)

    fig.update_layout(
        title=None,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font_color="#f0f0ff",
        margin=dict(l=0, r=0, t=8, b=0),
        xaxis=dict(showgrid=False),
        yaxis=dict(showgrid=True, gridcolor="rgba(255,255,255,0.06)"),
    )
    return fig