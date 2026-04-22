// interview-frontend/lib/dashboardApi.ts

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

export const dashboardApi = {
  listTemplates: () =>
    request("/dashboards/templates"),

  listDashboards: (interviewId?: string) =>
  request(`/dashboards${interviewId ? `?interview_id=${interviewId}` : ""}`),
  
  getDashboard: (id: string) =>
    request(`/dashboards/${id}`),

  autoGenerate: (interviewId: string, name?: string) =>
    request("/dashboards/auto-generate", {
      method: "POST",
      body: JSON.stringify({ interview_id: interviewId, name }),
    }),

  createFromTemplate: (interviewId: string, template: string, name?: string) =>
    request("/dashboards/from-template", {
      method: "POST",
      body: JSON.stringify({ interview_id: interviewId, template, name }),
    }),

  getWidgetData: (dashboardId: string, widgetId: string) =>
    request(`/dashboards/${dashboardId}/widgets/${widgetId}/data`),

  deleteDashboard: (id: string) =>
    request(`/dashboards/${id}`, { method: "DELETE" }),
};