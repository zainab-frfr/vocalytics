"use client";
import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  BarVisualizer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useLang } from "@/context/LanguageContext";

interface VoiceRoomProps {
  token: string;
  url: string;
  onComplete: () => void;
}

function RoomContent({ onComplete }: { onComplete: () => void }) {
  const { state, audioTrack } = useVoiceAssistant();
  const { t } = useLang();
  const [hasConnected, setHasConnected] = useState(false);

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

  return (
    <div style={{
      minHeight: "calc(100vh - 60px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", gap: 40,
    }}>
      <RoomAudioRenderer />

      <div style={{
        width: 200, height: 100,
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
            width: 80, height: 80, borderRadius: "50%",
            border: "3px solid rgba(168,85,247,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32,
          }}>
            🎙️
          </div>
        )}
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "8px 20px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 999,
          marginBottom: 12,
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

        <p style={{ fontSize: 13, color: "rgba(240,240,255,0.3)" }}>
          {state === "listening"
            ? "The agent is listening — speak your answer clearly"
            : "Wait for the agent to finish speaking"}
        </p>
      </div>

      <button
        className="btn-ghost"
        style={{ padding: "10px 24px", fontSize: 14 }}
        onClick={onComplete}
      >
        End Interview
      </button>
    </div>
  );
}

export default function VoiceRoom({ token, url, onComplete }: VoiceRoomProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect={true}
      audio={true}
      video={false}
      style={{ height: "100%" }}
    >
      <RoomContent onComplete={onComplete} />
    </LiveKitRoom>
  );
}