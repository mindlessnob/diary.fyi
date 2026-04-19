"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Movie } from "@/lib/parseRss";
import CalendarView from "@/components/CalendarView";

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isSubscribed = true;

    async function loadData() {
      try {
        const res = await fetch("/api/calendar");
        const data = await res.json();

        if (!isSubscribed) return;

        if (!res.ok) {
          setError(data.error ?? "Failed to load RSS feed.");
          return;
        }

        setMovies(data.movies);
      } catch {
        if (isSubscribed) {
          setError("Network error loading RSS feed.");
        }
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    loadData();
    return () => { isSubscribed = false; };
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "80px 24px", color: "var(--text-2)", fontSize: 13, minHeight: "calc(100vh - 52px)" }}>
        <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent)" }} />
        Loading diary feed...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 0", minHeight: "calc(100vh - 52px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "10px 14px", borderRadius: 8, background: "rgba(220,53,53,0.08)", border: "1px solid rgba(220,53,53,0.18)", color: "#e06060" }}>
          <AlertCircle size={14} />
          {error}
        </div>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div style={{ minHeight: "calc(100vh - 52px)" }}>
        <p style={{ textAlign: "center", padding: "80px 24px", color: "var(--text-2)", fontSize: 13 }}>
          No diary entries found in RSS feed.
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 52px)", background: "var(--bg)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 64px" }}>
        <CalendarView movies={movies} username="" />
      </div>
    </div>
  );
}
