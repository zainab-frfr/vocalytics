const API_URL = process.env.NEXT_PUBLIC_API_URL!;

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

export const api = {
  // Auth
  signup: (email: string, password: string) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  // Interviews
  createInterview: (data: { title: string; description?: string; questions: object[] }) =>
    request("/interviews/", { method: "POST", body: JSON.stringify(data) }),

  listInterviews: () => request("/interviews/"),

  getInterview: (id: string) => request(`/interviews/${id}`),

  deleteInterview: (id: string) =>
    request(`/interviews/${id}`, { method: "DELETE" }),

  getInterviewSessions: (id: string) => request(`/interviews/${id}/sessions`),

  // Sessions
  startSession: (interviewId: string, respondentName: string) =>
    request("/sessions/start", {
      method: "POST",
      body: JSON.stringify({ interview_id: interviewId, respondent_name: respondentName }),
    }),

  getSessionResponses: (sessionId: string) =>
    request(`/sessions/${sessionId}/responses`),
};
