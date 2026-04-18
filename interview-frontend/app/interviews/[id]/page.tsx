"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { api } from "@/lib/api";

interface Session {
  id: string;
  respondent_name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface Response {
  question_id: string;
  question_text: string;
  response: string;
  created_at: string;
}

export default function InterviewDetailPage() {
  const { user, loading } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [interview, setInterview] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  useEffect(() => {
    if (!user || !id) return;
    Promise.all([
      api.getInterview(id),
      api.getInterviewSessions(id),
    ]).then(([iData, sData]) => {
      setInterview(iData.interview);
      setSessions(sData.sessions);
    }).catch(console.error)
      .finally(() => setFetching(false));
  }, [user, id]);

  const loadResponses = async (sessionId: string) => {
    if (selectedSession === sessionId) {
      setSelectedSession(null);
      setResponses([]);
      return;
    }
    setSelectedSession(sessionId);
    setLoadingResponses(true);
    try {
      const data = await api.getSessionResponses(sessionId);
      setResponses(data.responses);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingResponses(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/interview/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || fetching) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)" }}>
        <p style={{ color: "rgba(240,240,255,0.5)" }}>{t.loading}</p>
      </div>
    );
  }

  if (!interview) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <p style={{ color: "rgba(240,240,255,0.5)" }}>Interview not found.</p>
        <Link href="/dashboard"><button className="btn-ghost" style={{ marginTop: 16 }}>Back</button></Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/dashboard" style={{ color: "rgba(240,240,255,0.4)", fontSize: 14, textDecoration: "none" }}>
          ← {t.dashboard}
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>{interview.title}</h1>
            {interview.description && (
              <p style={{ color: "rgba(240,240,255,0.4)", marginTop: 4 }}>{interview.description}</p>
            )}
          </div>
          <button className="btn-primary" onClick={copyLink} style={{ width: "auto", padding: "10px 20px", flexShrink: 0 }}>
            {copied ? t.copied : t.copyLink}
          </button>
        </div>
      </div>

      {/* Questions */}
      <div className="card" style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t.questions} ({interview.questions.length})</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {interview.questions.map((q: any, i: number) => (
            <div key={q.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{
                width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                background: "rgba(168,85,247,0.2)", color: "#a855f7",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
              }}>{i + 1}</span>
              <p style={{ fontSize: 14, color: "rgba(240,240,255,0.8)", lineHeight: 1.5 }}>{q.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sessions */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          {t.sessions} ({sessions.length})
        </h2>

        {sessions.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
            <p style={{ color: "rgba(240,240,255,0.4)", marginBottom: 8 }}>No responses yet.</p>
            <p style={{ color: "rgba(240,240,255,0.3)", fontSize: 13 }}>
              Share the interview link to start collecting responses.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sessions.map(session => (
              <div key={session.id}>
                <div
                  className="card"
                  style={{ cursor: "pointer", transition: "border-color 0.2s",
                    borderColor: selectedSession === session.id ? "#a855f7" : "rgba(255,255,255,0.1)" }}
                  onClick={() => loadResponses(session.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontWeight: 600 }}>{session.respondent_name}</p>
                      <p style={{ fontSize: 13, color: "rgba(240,240,255,0.4)", marginTop: 2 }}>
                        {new Date(session.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className={`badge badge-${session.status}`}>{t[session.status as keyof typeof t]}</span>
                      <span style={{ color: "rgba(240,240,255,0.3)", fontSize: 13 }}>
                        {selectedSession === session.id ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Responses dropdown */}
                {selectedSession === session.id && (
                  <div className="card" style={{
                    marginTop: 4, borderRadius: "0 0 16px 16px",
                    background: "rgba(168,85,247,0.05)",
                    borderColor: "#a855f7",
                  }}>
                    {loadingResponses ? (
                      <p style={{ color: "rgba(240,240,255,0.4)", fontSize: 14 }}>{t.loading}</p>
                    ) : responses.length === 0 ? (
                      <p style={{ color: "rgba(240,240,255,0.4)", fontSize: 14 }}>No responses recorded.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {responses.map((r, i) => (
                          <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 16 }}>
                            <p style={{ fontSize: 13, color: "#a855f7", fontWeight: 600, marginBottom: 6 }}>
                              Q{r.question_id}: {r.question_text}
                            </p>
                            <p style={{ fontSize: 14, color: "rgba(240,240,255,0.8)", lineHeight: 1.6 }}>
                              {r.response || <span style={{ color: "rgba(240,240,255,0.3)" }}>No answer recorded</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}