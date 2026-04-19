"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, BarChart } from "lucide-react";
import StatsDashboard, { FilmStatsData } from "@/components/StatsDashboard";

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statsData, setStatsData] = useState<FilmStatsData[]>([]);

  useEffect(() => {
    let isSubscribed = true;

    async function loadData() {
      try {
        const res = await fetch("/api/movies");
        const data = await res.json();
        
        if (!isSubscribed) return;

        if (!res.ok) {
          setError(data.error ?? "Failed to read static cache.");
          return;
        }

        setStatsData(data.movies);
      } catch (err: any) {
        if (isSubscribed) {
          setError("Network bridge error connecting to the static source.");
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isSubscribed = false;
    };
  }, []);

  if (error) {
    return (
      <div style={{ minHeight: "calc(100vh - 52px)", background: "var(--bg)" }}>
        <div style={{ maxWidth: 900, margin: "32px auto 0", padding: "0 24px" }}>
          <div className="animate-fade-up" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "10px 14px", borderRadius: 8, background: "rgba(220,53,53,0.08)", border: "1px solid rgba(220,53,53,0.18)", color: "#e06060" }}>
            <AlertCircle size={14} />
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 52px)", background: "var(--bg)", padding: "80px 24px" }}>
        <div className="animate-fade-up" style={{ maxWidth: 500, margin: "0 auto", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text)" }}>
             <Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)" }} />
             <span style={{ fontSize: 14, fontWeight: 600 }}>Loading Local Core</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.5, marginTop: 4 }}>
            Instantly mounting from the local JSON cache.
          </div>
        </div>
      </div>
    );
  }

  if (statsData.length === 0) {
    return (
      <div style={{ minHeight: "calc(100vh - 52px)", background: "var(--bg)" }}>
        <p style={{ textAlign: "center", padding: "80px 24px", color: "var(--text-2)", fontSize: 13 }}>
          No data available to crunch. Ensure <span className="mono">npx tsx scripts/scrape.ts</span> has been successfully executed.
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 52px)", background: "var(--bg)" }}>
      <div style={{ maxWidth: "100%", padding: "24px clamp(12px, 4vw, 40px) 80px" }} className="animate-fade-up">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid var(--border)", color: "var(--text)", flexWrap: "wrap" }}>
          <BarChart size={20} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <h2 style={{ fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>Stats and Data</h2>
        </div>
        <StatsDashboard movies={statsData} />
      </div>
    </div>
  );
}
