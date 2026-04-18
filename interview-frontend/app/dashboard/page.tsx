"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { api } from "@/lib/api";

interface Interview {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [fetching, setFetching] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      api.listInterviews()
        .then(data => setInterviews(data.interviews))
        .catch(console.error)
        .finally(() => setFetching(false));
    }
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this interview?")) return;
    setDeleting(id);
    try {
      await api.deleteInterview(id);
      setInterviews(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      alert("Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/interview/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading || fetching) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)" }}>
        <p style={{ color: "rgba(240,240,255,0.5)" }}>{t.loading}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>{t.myInterviews}</h1>
          <p style={{ color: "rgba(240,240,255,0.4)", marginTop: 4, fontSize: 14 }}>
            {user?.email}
          </p>
        </div>
        <Link href="/interviews/new">
          <button className="btn-primary" style={{ width: "auto", padding: "10px 20px" }}>
            + {t.createInterview}
          </button>
        </Link>
      </div>

      {interviews.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎙️</div>
          <p style={{ color: "rgba(240,240,255,0.4)", marginBottom: 24 }}>{t.noInterviews}</p>
          <Link href="/interviews/new">
            <button className="btn-primary" style={{ width: "auto", padding: "10px 24px" }}>
              + {t.createInterview}
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {interviews.map(interview => (
            <div key={interview.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{interview.title}</h3>
                {interview.description && (
                  <p style={{ fontSize: 13, color: "rgba(240,240,255,0.4)", marginBottom: 6 }}>{interview.description}</p>
                )}
                <p style={{ fontSize: 12, color: "rgba(240,240,255,0.3)" }}>
                  {new Date(interview.created_at).toLocaleDateString()}
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  className="btn-ghost"
                  style={{ padding: "7px 14px", fontSize: 13 }}
                  onClick={() => copyLink(interview.id)}
                >
                  {copied === interview.id ? t.copied : t.copyLink}
                </button>
                <Link href={`/interviews/${interview.id}`}>
                  <button className="btn-ghost" style={{ padding: "7px 14px", fontSize: 13 }}>
                    {t.viewResponses}
                  </button>
                </Link>
                <button
                  className="btn-ghost"
                  style={{ padding: "7px 14px", fontSize: 13, color: "#f87171", borderColor: "rgba(239,68,68,0.3)" }}
                  onClick={() => handleDelete(interview.id)}
                  disabled={deleting === interview.id}
                >
                  {deleting === interview.id ? "..." : t.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}