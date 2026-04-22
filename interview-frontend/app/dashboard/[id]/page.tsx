"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { dashboardApi } from "@/lib/dashboardApi";
import DashboardWidget from "@/components/dashboard/DashboardWidget";

export default function DashboardViewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [dashboard, setDashboard] = useState<any>(null);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading]);

  useEffect(() => {
    if (!user || !id) return;
    dashboardApi.getDashboard(id)
      .then(data => { setDashboard(data.dashboard); setWidgets(data.widgets); })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [user, id]);

  if (loading || fetching) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <p style={{ color: "rgba(240,240,255,0.5)" }}>Loading...</p>
    </div>
  );

  if (!dashboard) return (
    <div style={{ textAlign: "center", padding: 60 }}>
      <p style={{ color: "rgba(240,240,255,0.5)" }}>Dashboard not found.</p>
      <Link href="/dashboard"><button className="btn-ghost" style={{ marginTop: 16 }}>Back</button></Link>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: 32 }}>
        <Link href={`/interviews/${dashboard.interview_id}`}
          style={{ color: "rgba(240,240,255,0.4)", fontSize: 14, textDecoration: "none" }}>
          ← Back to Interview
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 12 }}>{dashboard.name}</h1>
        <p style={{ color: "rgba(240,240,255,0.4)", fontSize: 14, marginTop: 4 }}>
          {widgets.length} widget{widgets.length !== 1 ? "s" : ""}
        </p>
      </div>

      {widgets.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
          <p style={{ color: "rgba(240,240,255,0.4)" }}>No widgets yet.</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
          gap: 20,
        }}>
          {widgets.map(w => (
            <DashboardWidget key={w.id} dashboardId={id} widget={w} />
          ))}
        </div>
      )}
    </div>
  );
}