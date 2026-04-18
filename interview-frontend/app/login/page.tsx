"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 60px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>
      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
          {t.login}
        </h2>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            color: "#f87171", fontSize: 14,
          }}>{error}</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, color: "rgba(240,240,255,0.6)", display: "block", marginBottom: 6 }}>
              {t.email}
            </label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label style={{ fontSize: 13, color: "rgba(240,240,255,0.6)", display: "block", marginBottom: 6 }}>
              {t.password}
            </label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: 8 }}>
            {loading ? t.loading : t.login}
          </button>
        </div>

        <p style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: "rgba(240,240,255,0.5)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "#a855f7", textDecoration: "none" }}>
            {t.signup}
          </Link>
        </p>
      </div>
    </div>
  );
}