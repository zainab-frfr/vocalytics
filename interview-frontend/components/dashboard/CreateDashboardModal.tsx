// interview-frontend/components/dashboard/CreateDashboardModal.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { dashboardApi } from "@/lib/dashboardApi";

const TEMPLATES = [
  { id: "hr",   name: "HR Dashboard",           emoji: "👔", desc: "Score distribution, pass/fail, avg score" },
  { id: "viva", name: "Viva Dashboard",          emoji: "🎓", desc: "Question-wise performance, class average" },
  { id: "fmcg", name: "FMCG Research Dashboard", emoji: "📊", desc: "Response distribution, preferences" },
];

export default function CreateDashboardModal({
  interviewId,
  onClose,
}: { interviewId: string; onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"choose" | "template" | "auto">("choose");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  const handleAuto = async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.autoGenerate(interviewId, name || undefined);
      router.push(`/dashboard/${data.dashboard.id}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplate = async (templateId: string) => {
    setLoading(true);
    try {
      const data = await dashboardApi.createFromTemplate(interviewId, templateId, name || undefined);
      router.push(`/dashboard/${data.dashboard.id}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24
    }}>
      <div className="card" style={{ maxWidth: 480, width: "100%", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16,
          background: "none", border: "none", color: "rgba(240,240,255,0.4)", fontSize: 20, cursor: "pointer" }}>
          ✕
        </button>

        {mode === "choose" && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Create Dashboard</h2>
            <p style={{ color: "rgba(240,240,255,0.4)", fontSize: 14, marginBottom: 24 }}>
              Choose how to generate your dashboard
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button className="card" onClick={() => setMode("template")}
                style={{ textAlign: "left", cursor: "pointer", padding: "16px 20px",
                  borderColor: "rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.05)" }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>📋 Use Template</div>
                <div style={{ fontSize: 13, color: "rgba(240,240,255,0.4)" }}>HR, Viva, or FMCG pre-built layouts</div>
              </button>
              <button className="card" onClick={() => setMode("auto")}
                style={{ textAlign: "left", cursor: "pointer", padding: "16px 20px",
                  borderColor: "rgba(6,182,212,0.3)", background: "rgba(6,182,212,0.05)" }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>✨ Auto Generate</div>
                <div style={{ fontSize: 13, color: "rgba(240,240,255,0.4)" }}>AI picks the best charts from your data</div>
              </button>
            </div>
          </>
        )}

        {mode === "template" && (
          <>
            <button onClick={() => setMode("choose")} style={{ background: "none", border: "none",
              color: "rgba(240,240,255,0.4)", fontSize: 14, cursor: "pointer", marginBottom: 16 }}>
              ← Back
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Choose Template</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {TEMPLATES.map(t => (
                <button key={t.id} className="card" disabled={loading}
                  onClick={() => handleTemplate(t.id)}
                  style={{ textAlign: "left", cursor: "pointer", padding: "14px 18px" }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{t.emoji} {t.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(240,240,255,0.4)", marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {mode === "auto" && (
          <>
            <button onClick={() => setMode("choose")} style={{ background: "none", border: "none",
              color: "rgba(240,240,255,0.4)", fontSize: 14, cursor: "pointer", marginBottom: 16 }}>
              ← Back
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Auto Generate</h2>
            <p style={{ color: "rgba(240,240,255,0.4)", fontSize: 14, marginBottom: 20 }}>
              We'll inspect your response data and pick the best charts.
            </p>
            <input className="input" placeholder="Dashboard name (optional)"
              value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 16 }} />
            <button className="btn-primary" onClick={handleAuto} disabled={loading}>
              {loading ? "Generating..." : "✨ Generate Dashboard"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}