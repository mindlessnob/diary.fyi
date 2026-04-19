"use client";

import { useState } from "react";
import StoryModal from "./StoryModal";
import YearStoryCard from "./story/YearStoryCard";
import { InstagramIcon } from "./InstagramIcon";

interface Movie {
  slug?:       string;
  title:       string;
  year?:       number;
  runtime?:    number;
  directors?:  string[];
  genres?:     string[];
  countries?:  string[];
  rating?:     number | null;
  watchedDate: string;
  isRewatch?:  boolean;
  poster?:     string;
}

interface YearStats {
  year:         number;
  totalFilms:   number;
  totalHours:   number;
  avgRating:    string;
  rewatches:    number;
  topDirectors: [string, number][];
  topGenres:    [string, number][];
  topCountry:   string;
  monthCounts:  number[];
  firstFilm:    { title: string; poster: string; date: string } | null;
  lastFilm:     { title: string; poster: string; date: string } | null;
}

// y = 0 means All Time
function computeYearStats(movies: Movie[], y: number): YearStats {
  const pool  = y === 0
    ? movies.filter(m => !!m.watchedDate)
    : movies.filter(m => m.watchedDate?.startsWith(String(y)));
  const sorted = [...pool].sort((a, b) => (a.watchedDate ?? "").localeCompare(b.watchedDate ?? ""));

  let totalRuntime = 0, ratingSum = 0, ratingCount = 0, rewatches = 0;
  const dirCounts: Record<string, number> = {};
  const genreCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};
  // For All Time: monthCounts = films per year; for single year: films per month
  const monthCounts = Array(12).fill(0);

  pool.forEach(m => {
    if (m.runtime)   totalRuntime += m.runtime;
    if (m.rating)    { ratingSum += m.rating; ratingCount++; }
    if (m.isRewatch) rewatches++;
    (m.directors || []).forEach(d => { dirCounts[d] = (dirCounts[d] || 0) + 1; });
    (m.genres    || []).forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
    (m.countries || []).forEach(c => { countryCounts[c] = (countryCounts[c] || 0) + 1; });
    const mo = parseInt(m.watchedDate.slice(5, 7)) - 1;
    if (mo >= 0 && mo <= 11) monthCounts[mo]++;
  });

  const topDirectors = Object.entries(dirCounts).sort((a, b) => b[1] - a[1]).slice(0, 5) as [string, number][];
  const topGenres    = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5) as [string, number][];
  const topCountry   = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  const first = sorted[0];
  const last  = sorted[sorted.length - 1];

  return {
    year: y,
    totalFilms:  pool.length,
    totalHours:  Math.round(totalRuntime / 60),
    avgRating:   ratingCount > 0 ? (ratingSum / ratingCount).toFixed(2) : "—",
    rewatches,
    topDirectors,
    topGenres,
    topCountry,
    monthCounts,
    firstFilm: first ? { title: first.title, poster: first.poster || "", date: first.watchedDate } : null,
    lastFilm:  last  ? { title: last.title,  poster: last.poster  || "", date: last.watchedDate  } : null,
  };
}

function fmt(n: number) { return n.toLocaleString(); }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface Props {
  movies:   Movie[];
  years:    number[];
  username: string;
}

export default function YearInReview({ movies, years, username }: Props) {
  const ALL_TIME = 0;
  const [selectedYear, setSelectedYear] = useState(years[years.length - 1]);
  const [shareOpen, setShareOpen] = useState(false);

  const isAllTime = selectedYear === ALL_TIME;
  const stats = computeYearStats(movies, selectedYear);
  const peakMonth = stats.monthCounts.indexOf(Math.max(...stats.monthCounts));
  const barMax = stats.monthCounts[peakMonth] || 1;
  const yearLabel = isAllTime ? "All Time" : String(selectedYear);

  const rewatchPct = stats.totalFilms > 0 ? Math.round((stats.rewatches / stats.totalFilms) * 100) : 0;

  // Proxy posters for story card
  const storyStats = {
    ...stats,
    firstFilm: stats.firstFilm ? { ...stats.firstFilm, poster: stats.firstFilm.poster ? `/api/proxy-image?url=${encodeURIComponent(stats.firstFilm.poster)}` : "" } : null,
    lastFilm:  stats.lastFilm  ? { ...stats.lastFilm,  poster: stats.lastFilm.poster  ? `/api/proxy-image?url=${encodeURIComponent(stats.lastFilm.poster)}` : "" } : null,
  };

  return (
    <div style={{ minHeight: "calc(100dvh - 52px)", background: "var(--bg)", padding: "clamp(16px,5vw,48px) clamp(12px,4vw,40px) 80px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "clamp(22px,4vw,32px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)" }}>
              Year in Film
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-3)" }}>
              @{username} on Letterboxd
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "6px 12px", fontSize: 14, fontWeight: 600,
                color: "var(--text)", cursor: "pointer", outline: "none",
              }}
            >
              <option value={0}>All Time</option>
              {[...years].reverse().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button
              onClick={() => setShareOpen(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}
            >
              <InstagramIcon size={13} /> Share
            </button>
          </div>
        </div>

        {/* ── Hero stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
          {[
            { label: "Films Logged",  value: fmt(stats.totalFilms)         },
            { label: "Watch Time",     value: `${fmt(stats.totalHours)} hrs` },
            { label: "Avg Rating",     value: stats.avgRating !== "—" ? `${stats.avgRating} ★` : "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: "clamp(20px,3vw,26px)", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Secondary stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Rewatches",    value: fmt(stats.rewatches), sub: `${rewatchPct}% of diary` },
            { label: isAllTime ? "Peak Month (all years)" : "Peak Month", value: MONTHS[peakMonth], sub: `${stats.monthCounts[peakMonth]} films` },
            { label: "Top Country",  value: stats.topCountry || "—", sub: "" },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{value}</div>
              {sub && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* ── Monthly bar chart ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 16 }}>Monthly Activity</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
            {stats.monthCounts.map((c, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, minHeight: 16, display: "flex", alignItems: "flex-end" }}>
                  {c > 0 ? c : ""}
                </div>
                <div style={{
                  width: "100%",
                  height: c > 0 ? `${Math.max(6, Math.round((c / barMax) * 52))}px` : "3px",
                  borderRadius: 4,
                  background: i === peakMonth ? "#2eaadc" : c > 0 ? "rgba(46,170,220,0.45)" : "rgba(255,255,255,0.06)",
                  transition: "height 0.3s",
                }} />
                <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.02em" }}>
                  {MONTHS[i].slice(0, 3)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Top directors + genres side by side ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          {[
            { title: "Top Directors", data: stats.topDirectors },
            { title: "Top Genres",    data: stats.topGenres    },
          ].map(({ title, data }) => (
            <div key={title} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 14 }}>{title}</div>
              {data.map(([name, cnt], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? "var(--text)" : "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>
                    {i === 0 && <span style={{ color: "#2eaadc", marginRight: 5 }}>①</span>}{name}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? "#2eaadc" : "var(--text-3)", flexShrink: 0, marginLeft: 8 }}>{cnt}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── First + Last film ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: isAllTime ? "First Film Ever" : "First Film of the Year", film: stats.firstFilm },
            { label: isAllTime ? "Most Recent Film" : "Last Film of the Year",  film: stats.lastFilm  },
          ].map(({ label, film }) => (
            <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 52, flexShrink: 0, aspectRatio: "2/3", borderRadius: 8, overflow: "hidden", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                {film?.poster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={film.poster} alt={film.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 5 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>{film?.title ?? "—"}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{film?.date ?? ""}</div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Share modal */}
      <StoryModal open={shareOpen} onClose={() => setShareOpen(false)} filename={`${username}-${yearLabel}-year-in-film`}>
        <YearStoryCard stats={{ ...storyStats, year: isAllTime ? 0 : storyStats.year }} username={username} yearLabel={yearLabel} />
      </StoryModal>
    </div>
  );
}
