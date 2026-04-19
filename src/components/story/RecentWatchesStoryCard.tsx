import * as React from "react";

interface RecentWatch {
  title:       string;
  year:        string;
  rating:      number | null;
  poster:      string;
  watchedDate: string; // "YYYY-MM-DD"
}

interface Props {
  displayName:   string;
  username:      string;
  recentWatches: RecentWatch[];
}

const CARD_W = 540;
const CARD_H = 960;

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 18 }}>No rating</span>;
  const full = Math.floor(rating);
  const half = rating % 1 !== 0;
  return (
    <span style={{ color: "#6ee7b7", fontSize: 22, letterSpacing: "0.05em" }}>
      {"★".repeat(full)}{half ? "½" : ""}
    </span>
  );
}

export default function RecentWatchesStoryCard({ displayName, username, recentWatches }: Props) {
  // Calculate films watched this week and avg/day
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Count films whose watchedDate falls within last 7 days
  // Use all recentWatches' dates as a proxy — in practice, RSS returns ~50 items but we sliced to 4
  // We use the dates available to us
  const thisWeekCount = recentWatches.filter(f => {
    if (!f.watchedDate) return false;
    const d = new Date(f.watchedDate);
    return d >= weekAgo && d <= now;
  }).length;

  const avgPerDay = thisWeekCount > 0 ? (thisWeekCount / 7).toFixed(1) : "0";

  return (
    <div style={{
      width:          CARD_W,
      height:         CARD_H,
      background:     "#0e0e0e",
      fontFamily:     "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display:        "flex",
      flexDirection:  "column",
      position:       "relative",
      overflow:       "hidden",
    }}>
      {/* Background Glow */}
      <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(46,170,220,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: "50%", transform: "translateX(-50%)", width: 400, height: 300, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(110,231,183,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, padding: "60px 40px" }}>

        {/* Label */}
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)", marginBottom: 18 }}>
          Recently Watched
        </div>

        {/* Narrative Header */}
        <p style={{ margin: 0, marginBottom: 40, fontSize: 36, fontWeight: 800, lineHeight: 1.18, letterSpacing: "-0.03em", color: "#ffffff" }}>
          <span style={{ color: "var(--accent)" }}>{displayName}</span> has watched{" "}
          <span style={{ color: "#ffffff" }}>{thisWeekCount} film{thisWeekCount !== 1 ? "s" : ""}</span>{" "}
          this week,{" "}
          <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 600, fontSize: 30 }}>
            averaging {avgPerDay}/day.
          </span>
          <span style={{ display: "block", marginTop: 16, fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "-0.02em" }}>
            Here are his four last watched.
          </span>
        </p>

        {/* Film List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {recentWatches.map((film, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {/* Poster */}
              <div style={{ width: 76, flexShrink: 0, aspectRatio: "2/3", borderRadius: 10, overflow: "hidden", background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>
                {film.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={film.poster} alt={film.title} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontSize: 20 }}>?</div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.02em", color: "#ffffff" }}>
                  {film.title}
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", fontWeight: 500, marginTop: 3 }}>
                  {film.year}
                </div>
                <div style={{ marginTop: 6 }}>
                  <Stars rating={film.rating} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 36, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", letterSpacing: "0.04em" }}>
            @{username} on Letterboxd
          </div>
        </div>

      </div>
    </div>
  );
}
