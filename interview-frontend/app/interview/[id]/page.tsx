"use client";
import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { useLang } from "@/context/LanguageContext";
import { api } from "@/lib/api";
import VoiceRoom from "../../../components/VoiceRoom";

interface Question {
  id: string;
  text: string;
  order: number;
}

export default function InterviewPage() {
  const { t } = useLang();
  const params = useParams();
  const id = params.id as string;

  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roomInfo, setRoomInfo] = useState<{
    livekit_token: string;
    livekit_url: string;
    session_id: string;
  } | null>(null);

  const [interviewTitle, setInterviewTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  // Fetch interview details on load
  useEffect(() => {
    if (!id) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/internal/interviews/${id}/questions`, {
      headers: { "X-Internal-API-Key": "changeme" }
    })
      .then(r => r.json())
      .then(data => {
        setInterviewTitle(data.title || "");
        setQuestions(data.questions || []);
      })
      .catch(console.error);
  }, [id]);

  const handleStart = async () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    setError("");
    setLoading(true);
    try {
      const data = await api.startSession(id, name.trim());
      setRoomInfo(data);
      setStarted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = useCallback(() => {
    setCompleted(true);
  }, []);

  if (completed) {
    return (
      <div style={{
        minHeight: "calc(100vh - 60px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px", textAlign: "center",
      }}>
        <div>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }} className="gradient-text">
            {t.interviewComplete}
          </h1>
          <p style={{ color: "rgba(240,240,255,0.5)", fontSize: 18 }}>{t.thankYou}</p>
        </div>
      </div>
    );
  }

  if (started && roomInfo) {
    return (
      <VoiceRoom
        token={roomInfo.livekit_token}
        url={roomInfo.livekit_url}
        onComplete={handleComplete}
        questions={questions}
        interviewTitle={interviewTitle}
      />
    );
  }

  return (
    <div style={{
      minHeight: "calc(100vh - 60px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
      background: "radial-gradient(ellipse at top, rgba(168,85,247,0.15) 0%, transparent 60%)",
    }}>
      <div className="card" style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        {interviewTitle && (
          <p style={{
            fontSize: 13, color: "#a855f7", fontWeight: 600,
            marginBottom: 8, letterSpacing: 0.5,
          }}>
            {interviewTitle}
          </p>
        )}
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎙️</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{t.startInterview}</h1>
        <p style={{ color: "rgba(240,240,255,0.5)", marginBottom: 28, fontSize: 14 }}>
          {t.enterName}
        </p>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            color: "#f87171", fontSize: 14,
          }}>{error}</div>
        )}

        <input
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t.yourName}
          style={{ marginBottom: 16, textAlign: "center" }}
          onKeyDown={e => e.key === "Enter" && handleStart()}
        />
        <button className="btn-primary" onClick={handleStart} disabled={loading}>
          {loading ? t.connecting : t.startInterview}
        </button>
      </div>
    </div>
  );
}