"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { api } from "@/lib/api";

interface Question {
  id: string;
  text: string;
  type: "general" | "conditional";
  order: number;
}

export default function NewInterviewPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { id: "1", text: "", type: "general", order: 1 }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addQuestion = () => {
    const newId = String(questions.length + 1);
    setQuestions(prev => [...prev, {
      id: newId, text: "", type: "general", order: prev.length + 1
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) return;
    setQuestions(prev => prev
      .filter((_, i) => i !== index)
      .map((q, i) => ({ ...q, id: String(i + 1), order: i + 1 }))
    );
  };

  const updateQuestion = (index: number, text: string) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, text } : q));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setQuestions(prev => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr.map((q, i) => ({ ...q, id: String(i + 1), order: i + 1 }));
    });
  };

  const moveDown = (index: number) => {
    if (index === questions.length - 1) return;
    setQuestions(prev => {
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr.map((q, i) => ({ ...q, id: String(i + 1), order: i + 1 }));
    });
  };

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) { setError("Title is required"); return; }
    const empty = questions.find(q => !q.text.trim());
    if (empty) { setError("All questions must have text"); return; }

    setLoading(true);
    try {
      const data = await api.createInterview({ title, description, questions });
      router.push(`/interviews/${data.interview.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>{t.createInterview}</h1>
      </div>

      {error && (
        <div style={{
          background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 10, padding: "10px 14px", marginBottom: 20,
          color: "#f87171", fontSize: 14,
        }}>{error}</div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: "rgba(240,240,255,0.6)", display: "block", marginBottom: 6 }}>
            {t.title} *
          </label>
          <input
            className="input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Rio Biscuit Research"
          />
        </div>
        <div>
          <label style={{ fontSize: 13, color: "rgba(240,240,255,0.6)", display: "block", marginBottom: 6 }}>
            {t.description}
          </label>
          <input
            className="input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>{t.questions}</h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {questions.map((q, index) => (
          <div key={index} className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: "linear-gradient(135deg, #a855f7, #06b6d4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "white",
              }}>
                {index + 1}
              </div>

              <textarea
                className="input"
                value={q.text}
                onChange={e => updateQuestion(index, e.target.value)}
                placeholder="Type your question here (can be in Urdu or English)..."
                rows={2}
                style={{ resize: "vertical", fontFamily: "inherit" }}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                <button
                  className="btn-ghost"
                  style={{ padding: "4px 8px", fontSize: 12 }}
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                >↑</button>
                <button
                  className="btn-ghost"
                  style={{ padding: "4px 8px", fontSize: 12 }}
                  onClick={() => moveDown(index)}
                  disabled={index === questions.length - 1}
                >↓</button>
                <button
                  className="btn-ghost"
                  style={{ padding: "4px 8px", fontSize: 12, color: "#f87171", borderColor: "rgba(239,68,68,0.3)" }}
                  onClick={() => removeQuestion(index)}
                  disabled={questions.length === 1}
                >✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn-ghost" onClick={addQuestion} style={{ width: "100%", marginBottom: 24, padding: "12px" }}>
        + {t.addQuestion}
      </button>

      <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? t.loading : t.save}
      </button>
    </div>
  );
}