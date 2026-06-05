const API_URL = process.env.NEXT_PUBLIC_API_URL!;

// ── Auth ──────────────────────────────────────────────────────
function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}


// ── Cache ─────────────────────────────────────────────────────
// Short TTL so backend invalidations are picked up quickly.
// Backend is the real cache — this just avoids hammering it on
// every re-render / tab switch within the same minute.
const TTL_MS = 60 * 1000; // 1 min

interface CacheEntry {
  value: unknown;
  ts: number;
}

const _cache = new Map<string, CacheEntry>();

function cacheGet(key: string): unknown | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) { _cache.delete(key); return null; }
  return entry.value;
}

function cacheSet(key: string, value: unknown) {
  _cache.set(key, { value, ts: Date.now() });
}

function cacheInvalidate() {
  _cache.clear(); // always wipe everything on any write
}

async function cachedRequest(key: string, path: string) {
  const hit = cacheGet(key);
  if (hit !== null) return hit;
  const data = await request(path);
  cacheSet(key, data);
  return data;
}


// ── API ───────────────────────────────────────────────────────
export const api = {
  // Auth — never cached
  signup: (email: string, password: string) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  // Interviews
  createInterview: async (data: {
    title: string; description?: string;
    questions: object[]; prompt?: string; language?: string;
  }) => {
    const result = await request("/interviews/", { method: "POST", body: JSON.stringify(data) });
    cacheInvalidate(); // wipe frontend cache — backend already wiped its own
    return result;
  },

  listInterviews: () =>
    cachedRequest("interviews:list", "/interviews/"),

  getInterview: (id: string) =>
    cachedRequest(`interviews:${id}`, `/interviews/${id}`),

  deleteInterview: async (id: string) => {
    const result = await request(`/interviews/${id}`, { method: "DELETE" });
    cacheInvalidate();
    return result;
  },

  getInterviewSessions: (id: string) =>
    cachedRequest(`sessions:${id}`, `/interviews/${id}/sessions`),

  startSession: async (interviewId: string, respondentName: string) => {
    const result = await request("/sessions/start", {
      method: "POST",
      body: JSON.stringify({ interview_id: interviewId, respondent_name: respondentName }),
    });
    cacheInvalidate();
    return result;
  },

  getSessionResponses: (sessionId: string) =>
    cachedRequest(`responses:${sessionId}`, `/sessions/${sessionId}/responses`),

  clearCache: () => _cache.clear(),
};