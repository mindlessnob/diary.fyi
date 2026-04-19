import * as React from "react";

interface Favorite {
  title: string;
  poster: string;
  slug:   string;
}

interface Props {
  displayName:      string;
  username:         string;
  avatar:           string;
  filmsWatched:     number;
  totalHours:       number;
  avgRating:        string;
  diaryEntries:     number;
  uniqueCountries:  number;
  uniqueDirectors:  number;
  rewatchPct:       number;
  favorites:        Favorite[];
  siteUrl?:         string;
}

const fmt = (n: number) => n.toLocaleString();

const CARD_W = 540;
const CARD_H = 960;

export default function ProfileStoryCard({
  displayName, username, avatar, filmsWatched,
  avgRating, diaryEntries, uniqueCountries, uniqueDirectors,
  rewatchPct, favorites,
  siteUrl = "moonboxd.vercel.app",
}: Props) {
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
      <div style={{ position: "absolute", bottom: -80, left: "50%", transform: "translateX(-50%)", width: 400, height: 300, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(232,130,161,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Content Container */}
      <div style={{ position: "relative", zIndex: 1, padding: "50px 40px", display: "flex", flexDirection: "column" }}>

        {/* Top Ribbon: Avatar & Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(255,255,255,0.1)" }}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={displayName} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎬</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em" }}>{displayName}</div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", fontWeight: 500, marginTop: 2 }}>@{username}</div>
          </div>
        </div>

        {/* Narrative paragraph 1 */}
        <div style={{ marginTop: 60 }}>
          <p style={{ margin: 0, fontSize: 38, fontWeight: 800, lineHeight: 1.18, letterSpacing: "-0.03em", color: "#ffffff" }}>
            <span style={{ color: "var(--accent)" }}>{displayName}</span> has watched<br/>
            more or less{" "}
            <span style={{ color: "#ffffff" }}>{fmt(filmsWatched)} films</span><br/>
            from{" "}
            <span style={{ color: "#ffffff" }}>{fmt(uniqueCountries)}</span>
            <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 600 }}> countries</span> and{" "}
            <span style={{ color: "#ffffff" }}>{fmt(uniqueDirectors)}</span>
            <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 600 }}> filmmakers.</span>
          </p>

          {/* Narrative paragraph 2 */}
          <p style={{ margin: 0, marginTop: 30, fontSize: 28, fontWeight: 600, lineHeight: 1.3, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.45)" }}>
            Rewatches{" "}
            <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>{rewatchPct}%</span>{" "}
            out of{" "}
            <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>{fmt(diaryEntries)}</span>{" "}
            diary entries and averaging{" "}
            <span style={{ color: "#6ee7b7", fontWeight: 800 }}>★ {avgRating}</span>{" "}
            rate among all films.
          </p>
        </div>

        {/* Divider + Favorites label */}
        {favorites.length > 0 && (
          <div style={{ marginTop: 44 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>
              Here are some of his all‑time favorites
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {favorites.slice(0, 4).map((fav, i) => (
                <div key={i} style={{ aspectRatio: "2/3", borderRadius: 12, overflow: "hidden", background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
                  {fav.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fav.poster} alt={fav.title} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)" }}>?</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 36, left: 40 }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", letterSpacing: "0.04em" }}>{siteUrl}</div>
      </div>
    </div>
  );
}
