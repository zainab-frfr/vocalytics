"use client";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";

export default function HomePage() {
  const { t } = useLang();

  return (
    <div style={{
      minHeight: "calc(100vh - 60px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      textAlign: "center",
      background: "radial-gradient(ellipse at top, rgba(168,85,247,0.15) 0%, transparent 60%), radial-gradient(ellipse at bottom, rgba(6,182,212,0.1) 0%, transparent 60%)",
    }}>
      <div style={{ maxWidth: 640 }}>
        <div style={{
          display: "inline-block",
          background: "rgba(168,85,247,0.15)",
          border: "1px solid rgba(168,85,247,0.3)",
          borderRadius: 999,
          padding: "6px 18px",
          fontSize: 13,
          color: "#c084fc",
          marginBottom: 24,
          fontWeight: 500,
        }}>
          AI-Powered Voice Interviews
        </div>

        <h1 style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
          <span className="gradient-text">{t.appName}</span>
        </h1>

        <p style={{ fontSize: 20, color: "rgba(240,240,255,0.65)", marginBottom: 40, lineHeight: 1.6 }}>
          {t.tagline}
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/signup">
            <button className="btn-primary" style={{ width: "auto", padding: "14px 32px", fontSize: 16 }}>
              {t.createInterview}
            </button>
          </Link>
          <Link href="/login">
            <button className="btn-ghost" style={{ padding: "14px 32px", fontSize: 16 }}>
              {t.login}
            </button>
          </Link>
        </div>

        <div style={{
          display: "flex",
          gap: 32,
          justifyContent: "center",
          marginTop: 64,
          flexWrap: "wrap",
        }}>
          {[
            { icon: "1", label: "Create interview" },
            { icon: "2", label: "Share a link" },
            { icon: "3", label: "Voice interview in Urdu" },
            { icon: "4", label: "Read transcripts" },
          ].map((item) => (
            <div key={item.label} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8
            }}>
              <div style={{
                width: 52, height: 52,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
                color: "#a855f7",
                fontWeight: 700,
              }}>{item.icon}</div>
              <span style={{ fontSize: 13, color: "rgba(240,240,255,0.5)" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}