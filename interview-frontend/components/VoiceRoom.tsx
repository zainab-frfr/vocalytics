"use client";
import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  BarVisualizer,
  useDataChannel,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useLang } from "@/context/LanguageContext";

interface Question {
  id: string;
  text: string;
  order: number;
}

interface VoiceRoomProps {
  token: string;
  url: string;
  onComplete: () => void;
  questions: Question[];
  interviewTitle: string;
}

function RoomContent({ onComplete, questions, interviewTitle }: {
  onComplete: () => void;
  questions: Question[];
  interviewTitle: string;
}) {
  const { state, audioTrack } = useVoiceAssistant();
  const { t } = useLang();
  const [hasConnected, setHasConnected] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useDataChannel("question_index", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload));
      if (data.type === "question_index") {
        setCurrentQuestionIndex(data.index);
      }
    } catch (e) {
      console.error("Failed to parse data message", e);
    }
  });

  useEffect(() => {
    if (
      state === "connecting" ||
      state === "listening" ||
      state === "speaking" ||
      state === "thinking"
    ) {
      setHasConnected(true);
    }
    if (state === "disconnected" && hasConnected) {
      setTimeout(onComplete, 1000);
    }
  }, [state, hasConnected]);

  const getStatusText = () => {
    switch (state) {
      case "connecting": return t.connecting;
      case "listening": return t.speakNow;
      case "thinking": return "...";
      case "speaking": return t.agentSpeaking;
      default: return t.connecting;
    }
  };

  const getStatusColor = () => {
    switch (state) {
      case "listening": return "#4ade80";
      case "speaking": return "#a855f7";
      case "thinking": return "#06b6d4";
      default: return "rgba(240,240,255,0.3)";
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div style={{
      minHeight: "calc(100vh - 60px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", gap: 32,
    }}>
      <RoomAudioRenderer />

      {/* Interview title */}
      {interviewTitle && (
        <p style={{ fontSize: 13, color: "#a855f7", fontWeight: 600, letterSpacing: 0.5 }}>
          {interviewTitle}
        </p>
      )}

      {/* Progress */}
      {questions.length > 0 && (
        <div style={{ display: "flex", gap: 6 }}>
          {questions.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: i === currentQuestionIndex
                ? "#a855f7"
                : i < currentQuestionIndex
                  ? "rgba(168,85,247,0.4)"
                  : "rgba(255,255,255,0.15)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>
      )}

      {/* Visualizer */}
      <div style={{
        width: 200, height: 80,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {audioTrack ? (
          <BarVisualizer
            trackRef={audioTrack}
            style={{ width: "100%", height: "100%" }}
            barCount={20}
          />
        ) : (
          <div style={{
            width: 70, height: 70, borderRadius: "50%",
            border: "3px solid rgba(168,85,247,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}>
            🎙️
          </div>
        )}
      </div>

      {/* Current question text */}
      {currentQuestion && (
        <div className="card" style={{
          maxWidth: 560, width: "100%", textAlign: "center",
          borderColor: state === "speaking" ? "#a855f7" : "rgba(255,255,255,0.1)",
          transition: "border-color 0.3s",
        }}>
          <p style={{ fontSize: 11, color: "rgba(240,240,255,0.3)", marginBottom: 8, fontWeight: 600 }}>
            {t.questionOf} {currentQuestionIndex + 1} {t.of} {questions.length}
          </p>
          <p style={{ fontSize: 16, color: "rgba(240,240,255,0.9)", lineHeight: 1.7 }}>
            {currentQuestion.text}
          </p>
        </div>
      )}

      {/* Status */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "8px 20px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 999,
          marginBottom: 8,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: getStatusColor(),
            boxShadow: `0 0 8px ${getStatusColor()}`,
          }} />
          <span style={{ fontSize: 14, color: "rgba(240,240,255,0.7)" }}>
            {getStatusText()}
          </span>
        </div>

        {state === "listening" && (
          <p style={{ fontSize: 12, color: "rgba(240,240,255,0.3)", marginTop: 4 }}>
            Speak your answer clearly
          </p>
        )}
      </div>

      {/* Next question button (manual advance) */}
      <div style={{ display: "flex", gap: 12 }}>
        {currentQuestionIndex < questions.length - 1 && state === "listening" && (
          <button
            className="btn-ghost"
            style={{ padding: "8px 20px", fontSize: 13 }}
            onClick={() => setCurrentQuestionIndex(i => i + 1)}
          >
            Next Question →
          </button>
        )}
        <button
          className="btn-ghost"
          style={{ padding: "8px 20px", fontSize: 13 }}
          onClick={onComplete}
        >
          End Interview
        </button>
      </div>
    </div>
  );
}

export default function VoiceRoom({ token, url, onComplete, questions, interviewTitle }: VoiceRoomProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect={true}
      audio={true}
      video={false}
      style={{ height: "100%" }}
    >
      <RoomContent
        onComplete={onComplete}
        questions={questions}
        interviewTitle={interviewTitle}
      />
    </LiveKitRoom>
  );
}