// interview-frontend/components/dashboard/DashboardWidget.tsx
"use client";
import { useEffect, useState } from "react";
import { dashboardApi } from "@/lib/dashboardApi";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import StatWidget from "./StatWidget";

const COLORS = ["#a855f7", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

interface WidgetData {
  chart_type: string;
  labels?: string[];
  datasets?: Array<{ label?: string; data: number[]; percentages?: number[] }>;
  value?: number;
  label?: string;
  meta?: Record<string, any>;
}

export default function DashboardWidget({
  dashboardId, widget,
}: { dashboardId: string; widget: any }) {
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi.getWidgetData(dashboardId, widget.id)
      .then(res => setData(res.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [dashboardId, widget.id]);

  return (
    <div className="card" style={{ minHeight: 200 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: "rgba(240,240,255,0.6)",
        marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {widget.title}
      </h3>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 140 }}>
          <div style={{ width: 24, height: 24, border: "2px solid #a855f7",
            borderTopColor: "transparent", borderRadius: "50%",
            animation: "spin 0.8s linear infinite" }} />
        </div>
      )}

      {error && (
        <p style={{ color: "#f87171", fontSize: 13 }}>Failed to load: {error}</p>
      )}

      {!loading && !error && data && <WidgetChart data={data} config={widget.config || {}} />}
    </div>
  );
}

function WidgetChart({ data, config }: { data: WidgetData; config: any }) {
  const { chart_type, labels = [], datasets = [] } = data;

  if (chart_type === "stat") {
    return <StatWidget value={data.value ?? 0} label={data.label ?? ""} meta={data.meta} config={config} />;
  }

  if (chart_type === "pie") {
    const pieData = labels.map((label, i) => ({
      name: label, value: datasets[0]?.data[i] ?? 0,
    }));
    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`}>
            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chart_type === "line") {
    const lineData = labels.map((label, i) => ({ name: label, value: datasets[0]?.data[i] ?? 0 }));
    return (
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={lineData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" tick={{ fill: "rgba(240,240,255,0.4)", fontSize: 11 }} />
          <YAxis tick={{ fill: "rgba(240,240,255,0.4)", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }} />
          <Line type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} dot={{ fill: "#a855f7" }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chart_type === "sentiment") {
    const sentData = labels.map((label, i) => ({ name: label, value: datasets[0]?.data[i] ?? 0 }));
    const sentColors = ["#10b981", "#6b7280", "#ef4444"];
    return (
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={sentData} layout="vertical">
          <XAxis type="number" tick={{ fill: "rgba(240,240,255,0.4)", fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: "rgba(240,240,255,0.4)", fontSize: 11 }} width={70} />
          <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {sentData.map((_, i) => <Cell key={i} fill={sentColors[i % sentColors.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Default: bar chart
  const barData = labels.map((label, i) => {
    const entry: Record<string, any> = { name: label.length > 20 ? label.slice(0, 20) + "…" : label };
    datasets.forEach((ds, di) => { entry[ds.label || `Series ${di + 1}`] = ds.data[i] ?? 0; });
    return entry;
  });
  const accentColor = config.color || "#a855f7";

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={barData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="name" tick={{ fill: "rgba(240,240,255,0.4)", fontSize: 11 }} />
        <YAxis tick={{ fill: "rgba(240,240,255,0.4)", fontSize: 11 }} />
        <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }} />
        {datasets.map((ds, i) => (
          <Bar key={i} dataKey={ds.label || `Series ${i + 1}`}
            fill={COLORS[i] || accentColor} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}