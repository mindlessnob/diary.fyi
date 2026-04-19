import * as React from "react";
import { getDaysInMonth } from "date-fns";

interface Movie {
  title:       string;
  poster:      string;
  slug?:       string;
  watchedDate: string;
  rating?:     number | null;
}

interface Props {
  month:      Date;
  movies:     Movie[];        // all movies in this month
  totalFilms: number;
  activeDays: number;
  username?:  string;
  siteUrl?:   string;
}

const CARD_W = 540;
const CARD_H = 960;

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/** Returns proxied poster URL */
function posterUrl(m: Movie): string {
  const raw = m.poster || (m.slug ? `/api/poster?slug=${m.slug}` : "");
  if (!raw) return "";
  if (raw.startsWith("/")) return raw; // relative—already fine for html2canvas
  return `/api/proxy-image?url=${encodeURIComponent(raw)}`;
}

export default function MonthStoryCard({
  month, movies, totalFilms, activeDays,
  username, siteUrl = "diary.fyi",
}: Props) {
  const monthName = MONTH_NAMES[month.getMonth()];
  const year      = month.getFullYear();
  const daysInMo  = getDaysInMonth(month);
  const firstDay  = new Date(year, month.getMonth(), 1).getDay(); // 0=Sun

  // Build a map: date string → movies array
  const moviesMap = new Map<string, Movie[]>();
  movies.forEach((m) => {
    const key = m.watchedDate;
    if (!moviesMap.has(key)) moviesMap.set(key, []);
    moviesMap.get(key)!.push(m);
  });

  // Build the grid cells
  const cells: { day: number | null; date: string | null }[] = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, date: null });
  for (let d = 1; d <= daysInMo; d++) {
    const mm   = String(month.getMonth() + 1).padStart(2, "0");
    const dd   = String(d).padStart(2, "0");
    cells.push({ day: d, date: `${year}-${mm}-${dd}` });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, date: null });

  const avgPerWeek = (totalFilms / (daysInMo / 7)).toFixed(1);

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
      <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(46,170,220,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, padding: "60px 36px 40px" }}>

        {/* Month Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>
            Film Diary
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 52, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.04em", lineHeight: 1 }}>
                {monthName}
              </div>
              <div style={{ fontSize: 22, color: "rgba(255,255,255,0.4)", marginTop: 4, letterSpacing: "-0.02em", fontWeight: 600 }}>
                {year}
              </div>
            </div>
            {/* Stat pill */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>
                This month
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.04em", color: "#2eaadc", lineHeight: 1 }}>
                {totalFilms}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                {totalFilms === 1 ? "entry" : "entries"}
              </div>
            </div>
          </div>
        </div>

        {/* Day labels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6, gap: 4 }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.2)", letterSpacing: "0.03em" }}>{d}</div>
          ))}
        </div>

        {/* Poster Calendar Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((cell, i) => {
            if (!cell.day || !cell.date) {
              return <div key={i} style={{ aspectRatio: "2/3" }} />;
            }

            const dayMovies = moviesMap.get(cell.date) || [];
            const has   = dayMovies.length > 0;
            const first = dayMovies[0];
            const extra = dayMovies.length - 1;

            return (
              <div key={i} style={{
                aspectRatio:   "2/3",
                borderRadius:  5,
                overflow:      "hidden",
                position:      "relative",
                border:        has ? "1px solid rgba(46,170,220,0.2)" : "1px solid rgba(255,255,255,0.05)",
                background:    "#1a1a1a",
              }}>
                {/* Poster image */}
                {has && posterUrl(first) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={posterUrl(first)}
                    alt={first.title}
                    crossOrigin="anonymous"
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}

                {/* Scrim */}
                {has && (
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.6) 100%)", pointerEvents: "none" }} />
                )}

                {/* +N badge */}
                {extra > 0 && (
                  <div style={{ position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,0.7)", borderRadius: 3, padding: "1px 4px", fontSize: 8, fontWeight: 700, color: "#fff" }}>
                    +{extra}
                  </div>
                )}

                {/* Day number */}
                <div style={{
                  position: "absolute", bottom: 3, left: 0, right: 0, textAlign: "center",
                  fontSize: 9, fontWeight: has ? 700 : 500, lineHeight: 1,
                  color: has ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)",
                  textShadow: has ? "0 1px 3px rgba(0,0,0,0.9)" : "none",
                }}>
                  {cell.day}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          {[
            { value: activeDays,  label: "Active days"  },
            { value: avgPerWeek, label: "Avg / week"   },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}</div>
            </div>
          ))}
        </div>

      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 32, left: 0, right: 0, textAlign: "center" }}>
        {username && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", letterSpacing: "0.04em" }}>@{username}</div>}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", letterSpacing: "0.04em", marginTop: 2 }}>{siteUrl}</div>
      </div>
    </div>
  );
}
