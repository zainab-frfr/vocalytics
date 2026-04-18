"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";

export default function SignupPage() {
  const { t } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await api.signup(email, password);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
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
          {t.signup}
        </h2>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            color: "#f87171", fontSize: 14,
          }}>{error}</div>
        )}

        {success && (
          <div style={{
            background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            color: "#4ade80", fontSize: 14,
          }}>Account created! Redirecting to login...</div>
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

          <button className="btn-primary" onClick={handleSubmit} disabled={loading || success} style={{ marginTop: 8 }}>
            {loading ? t.loading : t.signup}
          </button>
        </div>

        <p style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: "rgba(240,240,255,0.5)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#a855f7", textDecoration: "none" }}>
            {t.login}
          </Link>
        </p>
      </div>
    </div>
  );
}