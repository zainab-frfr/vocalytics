"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { api } from "@/lib/api";

const DEFAULT_PROMPT_UR = `You are a professional interview assistant conducting a research interview in Urdu.
Your goal is to ask the following questions in order.

Strict Rules:
1. Speak only in Urdu. Use simple, everyday language.
2. Ask one question at a time, exactly as written. Do not rephrase.
3. Wait for the user's response before moving to the next question.
4. If a response is irrelevant, politely ask them to answer the question.
5. Never echo the user's answer back.
6. Do not thank after each answer. Only say thank you at the very end.
7. Only repeat a question if the user asks for clarification.`;

const DEFAULT_PROMPT_EN = `You are a professional interview assistant conducting a research interview in English.
Your goal is to ask the following questions in order.

Strict Rules:
1. Speak only in English. Use simple, clear language.
2. Ask one question at a time, exactly as written. Do not rephrase.
3. Wait for the user's response before moving to the next question.
4. If a response is irrelevant, politely ask them to answer the question.
5. Never echo the user's answer back.
6. Do not thank after each answer. Only say thank you at the very end.
7. Only repeat a question if the user asks for clarification.`;

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
  const [language, setLanguage] = useState("ur");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT_UR);
  const [questions, setQuestions] = useState<Question[]>([
    { id: "1", text: "", type: "general", order: 1 }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setPrompt(lang === "ur" ? DEFAULT_PROMPT_UR : DEFAULT_PROMPT_EN);
  };

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
      const data = await api.createInterview({ title, description, questions, prompt, language });
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

      {/* Title + Description + Language */}
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

        <div style={{ marginBottom: 16 }}>
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

        <div>
          <label style={{ fontSize: 13, color: "rgba(240,240,255,0.6)", display: "block", marginBottom: 8 }}>
            Interview Language
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { value: "ur", label: "Urdu" },
              { value: "en", label: "English" },
            ].map(opt => (
              <button
                key={opt.value}
                className={language === opt.value ? "btn-primary" : "btn-ghost"}
                style={{ width: "auto", padding: "8px 24px" }}
                onClick={() => handleLanguageChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Prompt */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <label style={{ fontSize: 14, fontWeight: 600, display: "block" }}>
              Agent Prompt
            </label>
            <p style={{ fontSize: 12, color: "rgba(240,240,255,0.4)", marginTop: 2 }}>
              Customize how the AI agent behaves during the interview
            </p>
          </div>
          <button
            className="btn-ghost"
            style={{ padding: "4px 12px", fontSize: 12, flexShrink: 0 }}
            onClick={() => setPrompt(language === "ur" ? DEFAULT_PROMPT_UR : DEFAULT_PROMPT_EN)}
          >
            Reset to default
          </button>
        </div>
        <textarea
          className="input"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={10}
          style={{ resize: "vertical", fontFamily: "monospace", fontSize: 13, lineHeight: 1.6 }}
        />
      </div>

      {/* Questions */}
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