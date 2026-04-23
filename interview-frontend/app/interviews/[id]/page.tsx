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
interface SessionWithResponses extends Session {
  responses: Response[];
  loaded: boolean;
}

// ✅ CHANGED: Added SkeletonCell component for pretty loading
function SkeletonCell() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {[80, 60, 40].map((width, i) => (
        <div
          key={i}
          style={{
            height: 10,
            width: `${width}%`,
            borderRadius: 6,
            background: "linear-gradient(90deg, rgba(168,85,247,0.08) 25%, rgba(168,85,247,0.18) 50%, rgba(168,85,247,0.08) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }}
        />
      ))}
    </div>
  );
}

export default function InterviewDetailPage() {
  const { user, loading } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [interview, setInterview] = useState<any>(null);
  const [sessions, setSessions] = useState<SessionWithResponses[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hoveredQuestion, setHoveredQuestion] = useState<number | null>(null);

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
      const enriched = sData.sessions.map((s: Session) => ({
        ...s, responses: [], loaded: false,
      }));
      setSessions(enriched);
    }).catch(console.error)
      .finally(() => setFetching(false));
  }, [user, id]);

  useEffect(() => {
    if (sessions.length === 0) return;
    const unloaded = sessions.filter(s => !s.loaded);
    if (unloaded.length === 0) return;
    setLoadingAll(true);
    Promise.all(
      unloaded.map(s =>
        api.getSessionResponses(s.id).then(data => ({ id: s.id, responses: data.responses }))
      )
    ).then(results => {
      setSessions(prev => prev.map(s => {
        const found = results.find(r => r.id === s.id);
        return found ? { ...s, responses: found.responses, loaded: true } : s;
      }));
    }).catch(console.error)
      .finally(() => setLoadingAll(false));
  }, [sessions.length]);

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

  const questions: any[] = interview.questions;
  const sessionResponseMap = sessions.map(session => {
    const map: Record<string, string> = {};
    session.responses.forEach(r => { map[r.question_id] = r.response; });
    return map;
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>

      {/* ✅ CHANGED: Added shimmer keyframe animation via style tag */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

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

      {/* Table header */}
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>
          {t.sessions} ({sessions.length})
        </h2>
        {/* ✅ CHANGED: Replaced plain text with a styled loading pill */}
        {loadingAll && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(168,85,247,0.1)",
            border: "1px solid rgba(168,85,247,0.25)",
            borderRadius: 999,
            padding: "5px 14px",
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#a855f7",
              animation: "shimmer 1s infinite",
            }} />
            <span style={{ fontSize: 12, color: "#c084fc", fontWeight: 500 }}>
              Loading responses...
            </span>
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <p style={{ color: "rgba(240,240,255,0.4)", marginBottom: 8 }}>No responses yet.</p>
          <p style={{ color: "rgba(240,240,255,0.3)", fontSize: 13 }}>
            Share the interview link to start collecting responses.
          </p>
        </div>
      ) : (
        <div style={{
          overflowX: "auto",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            minWidth: questions.length * 220 + 200,
          }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th style={{
                  padding: "14px 16px",
                  textAlign: "left",
                  fontWeight: 600,
                  fontSize: 12,
                  color: "rgba(240,240,255,0.5)",
                  whiteSpace: "nowrap",
                  position: "sticky",
                  left: 0,
                  background: "rgba(15,10,30,0.98)",
                  zIndex: 2,
                  minWidth: 160,
                  borderRight: "1px solid rgba(255,255,255,0.08)",
                }}>
                  Respondent
                </th>
                <th style={{
                  padding: "14px 16px",
                  textAlign: "left",
                  fontWeight: 600,
                  fontSize: 12,
                  color: "rgba(240,240,255,0.5)",
                  whiteSpace: "nowrap",
                  minWidth: 110,
                  borderRight: "1px solid rgba(255,255,255,0.08)",
                }}>
                  Status
                </th>
                {questions.map((q, i) => (
                  <th
                    key={q.id}
                    style={{
                      padding: "14px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      fontSize: 12,
                      color: "#a855f7",
                      minWidth: 220,
                      maxWidth: 300,
                      borderRight: i < questions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      position: "relative",
                    }}
                    onMouseEnter={() => setHoveredQuestion(i)}
                    onMouseLeave={() => setHoveredQuestion(null)}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                        background: "rgba(168,85,247,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, color: "#a855f7",
                      }}>{i + 1}</span>
                      <span style={{
                        fontWeight: 500, color: "rgba(240,240,255,0.7)",
                        lineHeight: 1.4, display: "-webkit-box",
                        WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {q.text}
                      </span>
                    </div>
                    {hoveredQuestion === i && (
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        zIndex: 50,
                        background: "rgba(25,15,50,0.98)",
                        border: "1px solid rgba(168,85,247,0.4)",
                        borderRadius: 10,
                        padding: "12px 14px",
                        width: 280,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                        fontSize: 13,
                        color: "rgba(240,240,255,0.9)",
                        lineHeight: 1.6,
                        fontWeight: 400,
                        pointerEvents: "none",
                      }}>
                        <p style={{ color: "#a855f7", fontWeight: 600, fontSize: 11, marginBottom: 6 }}>
                          Question {i + 1}
                        </p>
                        {q.text}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, rowIdx) => {
                const responseMap = sessionResponseMap[rowIdx];
                return (
                  <tr
                    key={session.id}
                    style={{
                      borderBottom: rowIdx < sessions.length - 1
                        ? "1px solid rgba(255,255,255,0.05)" : "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(168,85,247,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{
                      padding: "14px 16px",
                      position: "sticky",
                      left: 0,
                      background: "rgba(15,10,30,0.98)",
                      zIndex: 1,
                      borderRight: "1px solid rgba(255,255,255,0.08)",
                      whiteSpace: "nowrap",
                    }}>
                      <p style={{ fontWeight: 600, color: "rgba(240,240,255,0.9)", fontSize: 13 }}>
                        {session.respondent_name}
                      </p>
                      <p style={{ fontSize: 11, color: "rgba(240,240,255,0.35)", marginTop: 2 }}>
                        {new Date(session.created_at).toLocaleString()}
                      </p>
                    </td>
                    <td style={{
                      padding: "14px 16px",
                      borderRight: "1px solid rgba(255,255,255,0.08)",
                      verticalAlign: "middle",
                    }}>
                      <span className={`badge badge-${session.status}`}>
                        {t[session.status as keyof typeof t]}
                      </span>
                    </td>
                    {questions.map((q, i) => {
                      const answer = responseMap[q.id];
                      return (
                        <td key={q.id} style={{
                          padding: "14px 16px",
                          verticalAlign: "top",
                          borderRight: i < questions.length - 1
                            ? "1px solid rgba(255,255,255,0.06)" : "none",
                          maxWidth: 300,
                        }}>
                          {/* ✅ CHANGED: Replaced "—" with SkeletonCell component */}
                          {!session.loaded ? (
                            <SkeletonCell />
                          ) : answer ? (
                            <p style={{
                              fontSize: 13, color: "rgba(240,240,255,0.8)",
                              lineHeight: 1.6, margin: 0,
                            }}>
                              {answer}
                            </p>
                          ) : (
                            <span style={{ color: "rgba(240,240,255,0.25)", fontSize: 12 }}>
                              No answer
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}