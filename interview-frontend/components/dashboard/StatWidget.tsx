// interview-frontend/components/dashboard/StatWidget.tsx
export default function StatWidget({
  value, label, meta, config,
}: { value: number; label: string; meta?: any; config?: any }) {
  const color = config?.color || "#a855f7";
  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <div style={{ fontSize: 48, fontWeight: 800, color, lineHeight: 1 }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: 14, color: "rgba(240,240,255,0.5)", marginTop: 8 }}>{label}</div>
      {meta?.completed !== undefined && (
        <div style={{ fontSize: 12, color: "rgba(240,240,255,0.3)", marginTop: 4 }}>
          {meta.completed} completed
        </div>
      )}
    </div>
  );
}