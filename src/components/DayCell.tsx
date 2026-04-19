"use client";

import { Movie } from "@/lib/parseRss";
import { useState } from "react";
import MovieModal from "./MovieModal";

interface DayCellProps {
  date: Date;
  movies: Movie[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

function PosterMosaic({ movies }: { movies: Movie[] }) {
  const strips = movies.slice(0, 3);
  const extra  = movies.length - 3;

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex" }}>
      {strips.map((m, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            flex: 1,
            overflow: "hidden",
            borderRight: i < strips.length - 1 ? "1px solid rgba(0,0,0,0.5)" : undefined,
          }}
        >
          {m.poster || m.slug ? (
            <img
              src={m.poster || `/api/poster?slug=${m.slug}`}
              alt={m.title}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
              loading="lazy"
            />
          ) : (
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "var(--surface-2)" }} />
          )}
        </div>
      ))}

      {/* +N overlay when >3 */}
      {extra > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: `${100 / strips.length}%`,
            background: "rgba(0,0,0,0.52)",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
            +{extra}
          </span>
        </div>
      )}

      {/* scrim for day-number readability */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: "none",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, transparent 35%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}

export default function DayCell({ date, movies, isToday, isCurrentMonth }: DayCellProps) {
  const [open, setOpen] = useState(false);
  const has   = movies.length > 0;
  const multi = movies.length > 1;

  return (
    <>
      <div
        role={has ? "button" : "gridcell"}
        tabIndex={has ? 0 : -1}
        aria-label={has ? `${date.getDate()}: ${movies.map((m) => m.title).join(", ")}` : String(date.getDate())}
        onClick={() => has && setOpen(true)}
        onKeyDown={(e) => { if (has && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen(true); } }}
        className="relative overflow-hidden group"
        style={{
          aspectRatio: "2/3",
          borderRadius: 6,
          cursor: has ? "pointer" : "default",
          border: isToday
            ? "1px solid var(--accent)"
            : "1px solid var(--border)",
          backgroundColor: has ? "var(--surface)" : "var(--surface)",
          opacity: isCurrentMonth ? 1 : 0.22,
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          if (has && !isToday) e.currentTarget.style.borderColor = "var(--border-2)";
        }}
        onMouseLeave={(e) => {
          if (!isToday) e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        {/* Multi poster mosaic */}
        {multi && <PosterMosaic movies={movies} />}

        {/* Single poster */}
        {!multi && has && (movies[0].poster || movies[0].slug) && (
          <>
            <img
              src={movies[0].poster || `/api/poster?slug=${movies[0].slug}`}
              alt={movies[0].title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.04) 40%, rgba(0,0,0,0.65) 100%)" }}
            />
          </>
        )}

        {/* Day number — bottom-center, distinct from the count badge at top-right */}
        <div
          style={{
            position: "absolute",
            bottom: 5,
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 20,
            fontSize: has ? 11 : 12,
            fontWeight: has ? 700 : 500,
            lineHeight: 1,
            color: isToday
              ? "var(--accent)"
              : has
              ? "rgba(255,255,255,0.88)"
              : "var(--text-3)",
            textShadow: has ? "0 1px 4px rgba(0,0,0,0.9)" : "none",
          }}
        >
          {date.getDate()}
        </div>

        {/* Multi-count badge */}
        {multi && (
          <div
            className="absolute top-1.5 right-1.5 z-20"
            style={{
              fontSize: 9,
              fontWeight: 700,
              lineHeight: 1,
              padding: "2px 4px",
              borderRadius: 4,
              background: "rgba(0,0,0,0.55)",
              color: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(2px)",
            }}
          >
            {movies.length}
          </div>
        )}
      </div>

      {open && <MovieModal movies={movies} date={date} onClose={() => setOpen(false)} />}
    </>
  );
}
