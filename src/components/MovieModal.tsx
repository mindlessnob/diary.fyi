"use client";

import { Movie, toStarString } from "@/lib/parseRss";
import { X, ExternalLink, RotateCcw } from "lucide-react";
import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface MovieModalProps {
  movies: Movie[];
  date: Date;
  onClose: () => void;
}

function fmt(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ModalContent({ movies, date, onClose }: MovieModalProps) {
  return (
    /* Backdrop — portal renders this directly into <body> so z-index always wins */
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Films on ${fmt(date)}`}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        padding: "16px",
      }}
    >
      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          /* dvh = dynamic viewport height that accounts for mobile browser chrome */
          maxHeight: "min(88dvh, 88vh, 680px)",
          display: "flex",
          flexDirection: "column",
          background: "#1c1c1c",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14,
          boxShadow: "0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)",
          animation: "modalIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "15px 16px 13px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#2eaadc",
                marginBottom: 4,
              }}
            >
              {movies.length === 1 ? "1 film watched" : `${movies.length} films watched`}
            </div>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                letterSpacing: "-0.02em",
                lineHeight: 1.3,
                margin: 0,
              }}
            >
              {fmt(date)}
            </h2>
          </div>

          <button
            id="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.07)",
              border: "none",
              color: "rgba(255,255,255,0.45)",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.14)";
              e.currentTarget.style.color = "rgba(255,255,255,0.85)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.07)";
              e.currentTarget.style.color = "rgba(255,255,255,0.45)";
            }}
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Scrollable list ── */}
        <div
          className="custom-scrollbar"
          style={{ flex: 1, overflowY: "auto", padding: "4px 0 8px" }}
        >
          {movies.map((movie, idx) => (
            <div
              key={`${movie.title}-${idx}`}
              style={{
                display: "flex",
                gap: 11,
                padding: "10px 16px",
                borderBottom: idx < movies.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {/* Poster */}
              <div
                style={{
                  flexShrink: 0,
                  width: 48,
                  height: 72,
                  borderRadius: 5,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.07)",
                  position: "relative",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {movie.poster ? (
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, opacity: 0.25,
                  }}>🎬</div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.88)",
                      lineHeight: 1.35,
                      letterSpacing: "-0.01em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {movie.title}
                  </div>
                  {movie.link && (
                    <a
                      href={movie.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0, marginTop: 2, transition: "color 0.15s" }}
                      title="View on Letterboxd"
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#2eaadc"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.2)"; }}
                    >
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                {/* Year + rewatch */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", fontWeight: 500 }}>
                    {movie.year}
                  </span>
                  {movie.isRewatch && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      fontSize: 9, fontWeight: 600, letterSpacing: "0.06em",
                      color: "rgba(255,255,255,0.3)",
                      background: "rgba(255,255,255,0.07)",
                      borderRadius: 4, padding: "1px 5px",
                    }}>
                      <RotateCcw size={8} strokeWidth={2.5} />
                      REWATCH
                    </span>
                  )}
                </div>

                {/* Stars */}
                {movie.rating !== null && (
                  <div style={{ fontSize: 12, color: "#d99c32", letterSpacing: "0.04em", lineHeight: 1, marginBottom: movie.review ? 5 : 0 }}>
                    {toStarString(movie.rating)}
                  </div>
                )}

                {/* Review */}
                {movie.review && movie.review.length > 12 && (
                  <div
                    style={{
                      marginTop: movie.rating !== null ? 0 : 4,
                      fontSize: 11.5,
                      lineHeight: 1.6,
                      color: "rgba(255,255,255,0.42)",
                    }}
                    dangerouslySetInnerHTML={{ __html: movie.review }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint for large lists */}
        {movies.length > 5 && (
          <div
            style={{
              flexShrink: 0,
              padding: "8px 16px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              fontSize: 10.5,
              color: "rgba(255,255,255,0.22)",
              textAlign: "center",
              letterSpacing: "0.04em",
            }}
          >
            {movies.length} films · scroll to see all
          </div>
        )}
      </div>
    </div>
  );
}

export default function MovieModal(props: MovieModalProps) {
  const onKey = useCallback((e: KeyboardEvent) => { if (e.key === "Escape") props.onClose(); }, [props.onClose]);

  useEffect(() => {
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onKey]);

  // Portal renders directly into <body> — no parent stacking context can interfere
  if (typeof window === "undefined") return null;
  return createPortal(<ModalContent {...props} />, document.body);
}
