import * as React from "react";

interface GenreEntry { name: string; count: number }

interface Props {
  totalFilms:       number;
  totalHours:       number;
  avgRating:        string;
  uniqueDirectors:  number;
  uniqueCountries:  number;
  topGenres:        GenreEntry[];   // top 5
  siteUrl?:         string;
}

const CARD_W = 540;
const CARD_H = 960;
const fmt = (n: number) => n.toLocaleString();

/** 9:16 Instagram Story card — Insights variant */
export default function InsightsStoryCard({
  totalFilms, totalHours, avgRating,
  uniqueDirectors, uniqueCountries, topGenres,
  siteUrl = "diary.fyi",
}: Props) {
  const maxCount = topGenres[0]?.count ?? 1;

  const barColors = ["#4da6ff", "#6ee7b7", "#e5b94b", "#e882a1", "#a78bfa"];

  return (
    <div style={{
      width:         CARD_W,
      height:        CARD_H,
      background:    "#0e0e0e",
      fontFamily:    "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display:       "flex",
      flexDirection: "column",
      alignItems:    "center",
      position:      "relative",
      overflow:      "hidden",
    }}>
      {/* Radial glow */}
      <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 480, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(77,166,255,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* ── Header label ────────────────────────────────── */}
      <div style={{ marginTop: 72, textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", marginBottom: 28 }}>
          My Film Stats
        </div>
      </div>

      {/* ── Big stats ───────────────────────────────────── */}
      <div style={{ width: 420, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px 10px 0 0", padding: "22px 28px 20px" }}>
          <div style={{ fontSize: 52, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.04em", lineHeight: 1 }}>
            {fmt(totalFilms)}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Films Watched
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: "18px 28px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 38, fontWeight: 800, color: "#6ee7b7", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {fmt(totalHours)} hrs
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Total Watch Time
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: "#e5b94b", letterSpacing: "-0.03em", lineHeight: 1 }}>
              ★ {avgRating}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Avg Rating
            </div>
          </div>
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────── */}
      <div style={{ width: 48, height: 1, background: "rgba(255,255,255,0.1)", marginTop: 36, marginBottom: 30 }} />

      {/* ── Top Genres ─────────────────────────────────── */}
      <div style={{ width: 420 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginBottom: 18 }}>
          Top Genres
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {topGenres.slice(0, 5).map((g, i) => {
            const pct = Math.round((g.count / maxCount) * 100);
            return (
              <div key={g.name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{g.name}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{fmt(g.count)}</span>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: barColors[i % barColors.length] }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────── */}
      <div style={{ width: 48, height: 1, background: "rgba(255,255,255,0.1)", marginTop: 34, marginBottom: 28 }} />

      {/* ── Extra stats ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: 2, width: 420 }}>
        {[
          { value: fmt(uniqueCountries), label: "Countries" },
          { value: fmt(uniqueDirectors), label: "Directors" },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: i === 0 ? "10px 0 0 10px" : "0 10px 10px 0", padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Glow bottom */}
      <div style={{ position: "absolute", bottom: -60, left: "50%", transform: "translateX(-50%)", width: 360, height: 240, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(229,185,75,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* ── Footer ──────────────────────────────────────── */}
      <div style={{ position: "absolute", bottom: 44, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", letterSpacing: "0.04em" }}>{siteUrl}</div>
      </div>
    </div>
  );
}
