"use client";

import { useEffect, useState } from "react";

interface Favorite {
  title:         string;
  year:          string;
  slug:          string;
  posterOverride: string;
  tmdbPoster:    string | null;
}

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='180'%3E%3Crect fill='%231e1e1e' width='120' height='180'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-size='14'%3E?%3C/text%3E%3C/svg%3E";

export default function FavoritesAdmin() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [inputs,    setInputs]    = useState<string[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState<number | null>(null);
  const [toast,     setToast]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/favorites")
      .then((r) => r.json())
      .then((d) => {
        const favs: Favorite[] = d.favorites || [];
        setFavorites(favs);
        setInputs(favs.map((f: Favorite) => f.posterOverride || ""));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const save = async (index: number) => {
    setSaving(index);
    try {
      const res = await fetch("/api/admin/favorites", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ index, posterOverride: inputs[index] }),
      });
      const d = await res.json();
      if (d.success) {
        setFavorites(d.favorites);
        showToast(`Saved override for ${favorites[index].title}`);
      }
    } finally {
      setSaving(null);
    }
  };

  const clearOverride = async (index: number) => {
    const next = [...inputs];
    next[index] = "";
    setInputs(next);
    setSaving(index);
    try {
      await fetch("/api/admin/favorites", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ index, posterOverride: "" }),
      });
      setFavorites((prev) =>
        prev.map((f, i) => (i === index ? { ...f, posterOverride: "" } : f))
      );
      showToast("Override cleared");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--text-3)", fontSize: 14 }}>
        Loading favorites…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 24px 60px" }}>

      <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 24, lineHeight: 1.7 }}>
        These four films are read from your Letterboxd <code>og:description</code>.<br />
        Paste a custom poster URL below to override the TMDB auto-match. After saving,{" "}
        <strong style={{ color: "var(--text-2)" }}>commit <code>src/data/favorites.json</code></strong> and push to apply on Vercel.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {favorites.map((fav, i) => {
          const activePoster = inputs[i] || fav.tmdbPoster || null;
          const hasOverride  = !!fav.posterOverride;

          return (
            <div
              key={fav.slug || i}
              style={{ background: "var(--surface)", border: `1px solid ${hasOverride ? "rgba(229,185,75,0.4)" : "var(--border)"}`, borderRadius: 10, padding: 16, display: "flex", gap: 14 }}
            >
              {/* Poster preview */}
              <div style={{ flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activePoster || PLACEHOLDER}
                  alt={fav.title}
                  style={{ width: 80, aspectRatio: "2/3", objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)", display: "block" }}
                />
                {hasOverride && (
                  <span style={{ display: "block", marginTop: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#e5b94b", textAlign: "center" }}>
                    Overridden
                  </span>
                )}
              </div>

              {/* Fields */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{fav.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{fav.year}</div>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", display: "block", marginBottom: 4 }}>
                    Poster URL override
                  </label>
                  <input
                    value={inputs[i]}
                    onChange={(e) => {
                      const n = [...inputs];
                      n[i] = e.target.value;
                      setInputs(n);
                    }}
                    placeholder={fav.tmdbPoster ? "TMDB auto (paste to override)" : "Paste image URL…"}
                    style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", fontSize: 11, color: "var(--text)", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => save(i)}
                    disabled={saving === i}
                    style={{ flex: 1, padding: "6px 0", borderRadius: 6, background: "rgba(46,170,220,0.12)", border: "1px solid rgba(46,170,220,0.3)", color: "#2eaadc", fontSize: 12, fontWeight: 600, cursor: saving === i ? "not-allowed" : "pointer" }}
                  >
                    {saving === i ? "Saving…" : "Save"}
                  </button>
                  {hasOverride && (
                    <button
                      onClick={() => clearOverride(i)}
                      disabled={saving === i}
                      style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(232,130,161,0.08)", border: "1px solid rgba(232,130,161,0.25)", color: "#e882a1", fontSize: 11, cursor: "pointer" }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1e1e1e", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 20px", fontSize: 13, color: "var(--text)", zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
