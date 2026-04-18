"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t, lang, toggleLang } = useLang();

  return (
    <nav style={{
      background: "rgba(15,15,26,0.85)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      position: "sticky", top: 0, zIndex: 100,
      padding: "0 24px",
      height: "60px",
      display: "flex", alignItems: "center", justifyContent: "space-between"
    }}>
      <Link href="/" style={{ textDecoration: "none" }}>
        <span className="gradient-text" style={{ fontSize: 22, fontWeight: 800 }}>
          {t.appName}
        </span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={toggleLang} className="btn-ghost" style={{ padding: "6px 14px", fontSize: 13 }}>
          {lang === "en" ? "اردو" : "English"}
        </button>

        {user ? (
          <>
            <Link href="/dashboard">
              <button className="btn-ghost" style={{ padding: "6px 14px", fontSize: 13 }}>
                {t.dashboard}
              </button>
            </Link>
            <button onClick={logout} className="btn-ghost" style={{ padding: "6px 14px", fontSize: 13 }}>
              {t.logout}
            </button>
          </>
        ) : (
          <>
            <Link href="/login">
              <button className="btn-ghost" style={{ padding: "6px 14px", fontSize: 13 }}>
                {t.login}
              </button>
            </Link>
            <Link href="/signup">
              <button className="btn-primary" style={{ width: "auto", padding: "6px 14px", fontSize: 13 }}>
                {t.signup}
              </button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
