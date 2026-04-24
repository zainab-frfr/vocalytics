"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  respondent_name: string;
  status: string;
}

interface RawResponse {
  question_id: string;
  question_text: string;
  response: string;
}

interface QuestionMeta {
  question_id: string;
  question_text: string;
  type: "mcq" | "open";
  answers: string[];
}

// ── Inference logic ──────────────────────────────────────────────────────────

function inferType(answers: string[]): "mcq" | "open" {
  const filled = answers.filter(a => a && a.trim().length > 0);
  if (filled.length === 0) return "open";

  const mcqCount = filled.filter(a => {
    const trimmed = a.trim();
    const isNumber = /^\d+(\.\d+)?$/.test(trimmed);
    const isSingleShortWord = !trimmed.includes(" ") && trimmed.length <= 15;
    return isNumber || isSingleShortWord;
  }).length;

  // If more than 60% of answers look like MCQ → treat as MCQ
  return mcqCount / filled.length >= 0.6 ? "mcq" : "open";
}

// ── Constants ────────────────────────────────────────────────────────────────

const MCQ_CHARTS  = ["Bar", "Pie", "Doughnut", "Frequency Distribution"];
const OPEN_CHARTS = ["Word Cloud", "Table View", "Keyword Frequency"];

const THEMES = [
  {
    id: "dark_purple",
    label: "Dark Purple",
    bg: "#0d0d1a",
    accent: "#7c3aed",
  },
  {
    id: "midnight_blue",
    label: "Midnight Blue",
    bg: "#0a0f1e",
    accent: "#3b82f6",
  },
  {
    id: "emerald",
    label: "Emerald",
    bg: "#0a1a0f",
    accent: "#10b981",
  },
  {
    id: "rose",
    label: "Rose",
    bg: "#1a0a0f",
    accent: "#f43f5e",
  },
];

const TEMPLATES = [
  { id: "generic",    label: "Generic"                     },
  { id: "restaurant", label: "Restaurant / Customer Reviews" },
  { id: "viva",       label: "Academic Viva"               },
  { id: "hr",         label: "HR Interview"                },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardConfigPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params  = useParams();
  const id      = params.id as string;

  const [interview,   setInterview]   = useState<any>(null);
  const [sessions,    setSessions]    = useState<Session[]>([]);
  const [allResponses, setAllResponses] = useState<RawResponse[]>([]); // flat, all sessions
  const [fetching,    setFetching]    = useState(true);
  const [theme,       setTheme]       = useState("dark_purple");
  const [template,    setTemplate]    = useState("generic");
  const [selections,  setSelections]  = useState<Record<string, string>>({});

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  // ── Fetch interview + all sessions + all responses ───────────────────────
  useEffect(() => {
    if (!user || !id) return;

    (async () => {
      try {
        const [iData, sData] = await Promise.all([
          api.getInterview(id),
          api.getInterviewSessions(id),
        ]);

        setInterview(iData.interview);
        const completedSessions: Session[] = (sData.sessions || []).filter(
          (s: Session) => s.status === "completed"
        );
        setSessions(completedSessions);

        // Fetch responses for every completed session in parallel
        const responseBatches = await Promise.all(
          completedSessions.map(s => api.getSessionResponses(s.id))
        );

        const flat: RawResponse[] = responseBatches.flatMap(b => b.responses || []);
        setAllResponses(flat);
      } catch (e) {
        console.error(e);
      } finally {
        setFetching(false);
      }
    })();
  }, [user, id]);

  // ── Derive question metadata with inferred types ─────────────────────────
  const questionMeta: QuestionMeta[] = useMemo(() => {
    if (allResponses.length === 0) return [];

    // Group by question_id
    const map = new Map<string, QuestionMeta>();
    for (const r of allResponses) {
      if (!map.has(r.question_id)) {
        map.set(r.question_id, {
          question_id:   r.question_id,
          question_text: r.question_text,
          type:          "open", // placeholder, set below
          answers:       [],
        });
      }
      if (r.response) map.get(r.question_id)!.answers.push(r.response);
    }

    // Infer type for each question, then sort by question_id
    const result = Array.from(map.values()).map(q => ({
      ...q,
      type: inferType(q.answers),
    }));

    result.sort((a, b) => String(a.question_id).localeCompare(String(b.question_id)));
    return result;
  }, [allResponses]);

  // ── Default chart selections once questionMeta is ready ──────────────────
  useEffect(() => {
    if (questionMeta.length === 0) return;
    setSelections(prev => {
      const next = { ...prev };
      for (const q of questionMeta) {
        if (!next[q.question_id]) {
          next[q.question_id] = q.type === "mcq" ? "Bar" : "Word Cloud";
        }
      }
      return next;
    });
  }, [questionMeta]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleChartChange = (qid: string, chart: string) => {
    setSelections(prev => ({ ...prev, [qid]: chart }));
  };

  const handleCreateDashboard = () => {
    const base       = process.env.NEXT_PUBLIC_STREAMLIT_URL || "http://localhost:8501";
    const chartCfg   = encodeURIComponent(JSON.stringify(selections));
    const typesCfg   = encodeURIComponent(
      JSON.stringify(Object.fromEntries(questionMeta.map(q => [q.question_id, q.type])))
    );
    const url = `${base}?interview_id=${id}&theme=${theme}&template=${template}&charts=${chartCfg}&types=${typesCfg}`;
    window.open(url, "_blank");
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading || fetching) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"calc(100vh - 60px)" }}>
        <p style={{ color:"rgba(240,240,255,0.5)" }}>Loading dashboard...</p>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth:800, margin:"0 auto", padding:"40px 24px" }}>

      {/* Back nav — matches interviews/[id]/page.tsx pattern */}
      <div style={{ marginBottom:32 }}>
        <Link href="/dashboard" style={{ color:"rgba(240,240,255,0.4)", fontSize:14, textDecoration:"none" }}>
  ← Back to Dashboard
</Link>
        <div style={{ marginTop:12 }}>
          <p style={{ fontSize:13, color:"#a855f7", fontWeight:600, marginBottom:6 }}>
            Dashboard Configuration
          </p>
          <h1 style={{ fontSize:26, fontWeight:700, marginBottom:4 }}>{interview?.title}</h1>
          {interview?.description && (
            <p style={{ fontSize:14, color:"rgba(240,240,255,0.4)" }}>{interview.description}</p>
          )}
          <p style={{ fontSize:13, color:"rgba(240,240,255,0.3)", marginTop:6 }}>
            {sessions.length} completed session{sessions.length !== 1 ? "s" : ""} ·{" "}
            {questionMeta.length} question{questionMeta.length !== 1 ? "s" : ""} detected
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom:24 }}>
  <p style={{
    fontSize:12,
    color:"rgba(240,240,255,0.4)",
    marginBottom:14,
    fontWeight:600
  }}>
    COLOR THEME
  </p>

  <div style={{
    display:"grid",
    gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))",
    gap:12
  }}>
    {THEMES.map(t => {
      const active = theme === t.id;

      return (
        <div
          key={t.id}
          onClick={() => setTheme(t.id)}
          style={{
            cursor:"pointer",
            borderRadius:10,
            border: active ? "2px solid #a78bfa" : "1px solid rgba(255,255,255,0.08)",
            overflow:"hidden",
            background:"#111",
            transition:"all 0.2s ease"
          }}
        >
          {/* Preview */}
          <div style={{
            height:80,
            background:t.bg,
            position:"relative",
            padding:8,
            display:"flex",
            flexDirection:"column",
            gap:6
          }}>
            {/* Fake mini dashboard bars */}
            <div style={{
              height:10,
              width:"60%",
              background:t.accent,
              borderRadius:4
            }} />
            <div style={{
              height:8,
              width:"80%",
              background:"rgba(255,255,255,0.2)",
              borderRadius:4
            }} />
            <div style={{
              height:8,
              width:"40%",
              background:"rgba(255,255,255,0.15)",
              borderRadius:4
            }} />

            {/* Fake chart block */}
            <div style={{
              marginTop:"auto",
              height:18,
              background:`linear-gradient(90deg, ${t.accent}, transparent)`,
              borderRadius:4,
              opacity:0.8
            }} />
          </div>

          {/* Label */}
          <div style={{
            padding:"8px 10px",
            fontSize:12,
            color: active ? "#fff" : "rgba(240,240,255,0.7)",
            background:"rgba(255,255,255,0.02)"
          }}>
            {t.label}
          </div>
        </div>
      );
    })}
  </div>
</div>

      

      {/* ── Per-question chart selection ─────────────────────────────────────── */}
      {questionMeta.length === 0 ? (
        <div className="card" style={{ textAlign:"center", padding:"40px 24px" }}>
          <p style={{ color:"rgba(240,240,255,0.4)" }}>
            No completed responses found. Share the interview link to collect responses first.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:32 }}>
            {questionMeta.map((q, idx) => {
              const isOpen   = q.type === "open";
              const options  = isOpen ? OPEN_CHARTS : MCQ_CHARTS;
              const selected = selections[q.question_id];

              return (
                <div key={q.question_id} className="card" style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {/* Question header */}
                  <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <span style={{
                      width:24, height:24, borderRadius:6, flexShrink:0,
                      background:"rgba(168,85,247,0.2)", color:"#a855f7",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:12, fontWeight:700,
                    }}>{idx + 1}</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:14, color:"rgba(240,240,255,0.85)", lineHeight:1.5 }}>
                        {q.question_text}
                      </p>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
                        <span style={{
                          fontSize:10, fontWeight:700, letterSpacing:0.5,
                          padding:"2px 8px", borderRadius:4,
                          background: isOpen ? "rgba(96,165,250,0.15)" : "rgba(167,139,250,0.15)",
                          color:       isOpen ? "#60a5fa"               : "#a78bfa",
                        }}>
                          {isOpen ? "OPEN-ENDED" : "MCQ"}
                        </span>
                        <span style={{ fontSize:11, color:"rgba(240,240,255,0.25)" }}>
                          {q.answers.length} answer{q.answers.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chart type buttons */}
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", paddingLeft:34 }}>
                    {options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleChartChange(q.question_id, opt)}
                        className={selected === opt ? "btn-primary" : "btn-ghost"}
                        style={{ padding:"5px 12px", fontSize:12, width:"auto" }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Create Dashboard CTA ─────────────────────────────────────────── */}
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button
              className="btn-primary"
              style={{ padding:"12px 28px", fontSize:15, width:"auto" }}
              onClick={handleCreateDashboard}
            >
              Create Dashboard
            </button>
          </div>
        </>
      )}
    </div>
  );
}