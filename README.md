# 🎙️ Vocalytics

> **Voice-based interview agents, at scale.** Create an interview, share a link, collect spoken responses — in Urdu or English.

Vocalytics is a platform for conducting AI-powered voice interviews — think Google Forms, but fully voice-based. An interviewer creates a customised interview, shares a link, and respondents give their answers by speaking naturally in the browser. Responses are transcribed, stored, and surfaced through an analytics dashboard in real time.

---

## ✨ Features

- **Voice Interview Builder** — Create flexible, prompt-driven interview flows (not rigid predefined templates)
- **One-Link Distribution** — Share a single URL; respondents need no account, no app, no phone call
- **Real-Time Transcription** — Powered by Deepgram; responses are transcribed live as the respondent speaks
- **LLM-Based Relevancy Checking** — LLaMA 3.3 (via Groq) evaluates whether a question was actually answered before deciding to move on or probe further; outperformed cosine similarity matching on natural, nuanced speech
- **Natural Turn-Taking via VAD** — Voice Activity Detection detects when the respondent starts and stops speaking, so the agent pauses and resumes naturally instead of talking over them
- **Urdu + English Support** — Bilingual support across the full pipeline (STT → LLM → TTS)
- **Client Dashboard** — Streamlit analytics dashboard for reviewing transcripts and response data
- **Simultaneous Interviews** — Multiple respondents can be interviewed concurrently via the same link

---

## 🏗️ Tech Stack

| Layer | Tool | Purpose |
|---|---|---|
| Frontend | Next.js (React) | User-facing interview UI |
| Analytics | Streamlit | Client dashboard for response review |
| Voice infrastructure | LiveKit Cloud | WebRTC-based real-time audio streaming |
| Backend agent | Python + LiveKit SDK | Interview agent logic, VAD, question routing |
| Speech-to-Text | Deepgram | Real-time audio transcription |
| Language Model | LLaMA 3.3 via Groq | Relevancy checking, question routing |
| Text-to-Speech | Azure Cognitive Services | Agent voice output |
| Database | Supabase (PostgreSQL) | Transcript and response storage |

---

## 🔄 How It Works

```
Interviewer creates interview & customises questions
            │
            ▼
      Shareable link generated
            │
            ▼
Respondent opens link in browser → LiveKit WebRTC session starts
            │
            ▼
  Agent speaks question (Azure TTS)
            │
            ▼
   VAD detects respondent speaking → agent pauses
            │
            ▼
  Deepgram transcribes response in real time
            │
            ▼
  LLaMA 3.3 checks relevancy:
    ├── Answered? → next question
    └── Not answered / dependent path? → follow-up or re-prompt
            │
            ▼
  Transcript + metadata saved to Supabase
            │
            ▼
  Interviewer views results on Streamlit dashboard
```

---

## 🧠 Key Technical Challenges

### Relevancy & Question Routing
Early versions asked the next question regardless of whether the previous one was answered. We evaluated two approaches:

| Approach | Result |
|---|---|
| Cosine similarity matching | Failed on natural speech — hedging, tangents, partial answers all scored poorly |
| **LLM-based checking (LLaMA 3.3)** | Understands context and intent; significantly more robust on real spoken responses |

### Real-Time Conversation
Moving from a request-response loop to WebRTC (via LiveKit) enabled true real-time audio. We implemented Voice Activity Detection so the agent can detect when a respondent begins speaking mid-response, pause appropriately, and resume — producing a natural conversational rhythm rather than rigid turn-taking.

---

## 📂 Repository Structure

```
vocalytics/
├── interview-backend/     # Python LiveKit agent, VAD, LLM routing, Supabase integration
└── interview-frontend/    # Next.js UI for interview creation and respondent experience
```

---

## 🚀 Getting Started

### Prerequisites
You will need API keys for the following services (all have free tiers):
- [LiveKit Cloud](https://livekit.io) — real-time voice infrastructure
- [Deepgram](https://deepgram.com) — speech-to-text
- [Groq](https://console.groq.com) — LLaMA inference
- [Azure Cognitive Services](https://azure.microsoft.com/en-us/products/cognitive-services/) — text-to-speech
- [Supabase](https://supabase.com) — database

### Backend

```bash
cd interview-backend
pip install -r requirements.txt
```

Create a `.env` file:

```env
LIVEKIT_URL=your_livekit_url
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
DEEPGRAM_API_KEY=your_deepgram_key
GROQ_API_KEY=your_groq_key
AZURE_SPEECH_KEY=your_azure_key
AZURE_SPEECH_REGION=your_azure_region
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

```bash
python main.py
```

### Frontend

```bash
cd interview-frontend
npm install
npm run dev
```

---

## 🌍 Differentiators

- **Urdu support** — full bilingual pipeline, not just UI translation
- **Web-based** — runs entirely in the browser; no telephony infrastructure required
- **Prompt-driven flexibility** — interviewers write natural-language instructions rather than selecting from predefined question templates
- **LLM relevancy engine** — the agent genuinely understands responses, not just pattern-matches them



## 📄 License

MIT License
