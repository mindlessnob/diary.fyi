import * as React from "react";
import { Star } from "lucide-react";

interface MatchedMovie {
  slug: string;
  title: string;
  year: number | null;
  director?: string;
  poster: string;
  watchedDate: string | null;
  rating: number | null;
  isRewatch: boolean;
  yearsAgo: number;
}

interface Props {
  movie: MatchedMovie;
  dateStr: string;
  nickname: string;
}

const CARD_W = 540;
const CARD_H = 960;

/** 9:16 Instagram Story card — On This Day Narrative Edition */
export default function OnThisDayStoryCard({ movie, dateStr, nickname }: Props) {
  return (
    <div style={{
      width:         CARD_W,
      height:        CARD_H,
      background:    "#0e0e0e",
      fontFamily:    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display:       "flex",
      flexDirection: "column",
      position:      "relative",
      overflow:      "hidden",
    }}>
      {/* ── Background Glow ────────────────────────────── */}
      <div style={{
        position:   "absolute",
        top:        -120,
        left:       "50%",
        transform:  "translateX(-50%)",
        width:      480,
        height:     480,
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(46,170,220,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position:   "absolute",
        bottom:     -80,
        left:       "50%",
        transform:  "translateX(-50%)",
        width:      400,
        height:     300,
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(232,130,161,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ── Content ────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 40px", textAlign: "center" }}>
        
        {/* Floating Poster Block */}
        <div style={{ width: 280, aspectRatio: "2/3", borderRadius: 16, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", marginBottom: 40 }}>
          {movie.poster ? (
             // eslint-disable-next-line @next/next/no-img-element
            <img src={movie.poster} alt={movie.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, padding: 20 }}>
              {movie.title}
            </div>
          )}
        </div>

        {/* Narrative Typesetting Center Aligned */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
           <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 20 }}>
             On This Day <span style={{ opacity: 0.4, margin: "0 8px" }}>//</span> {dateStr}
           </div>

           <p style={{ margin: 0, fontSize: 32, fontWeight: 500, lineHeight: 1.35, letterSpacing: "-0.01em", color: "#ffffff" }}>
             <span style={{ color: "var(--accent)", fontWeight: 700 }}>{nickname}</span> 
             {" "}watched{" "}
             <span style={{ fontWeight: 800, fontSize: 44, lineHeight: 1.1, display: "block", marginTop: 12, marginBottom: 8, letterSpacing: "-0.03em" }}>
               “{movie.title}”
             </span>
             {movie.director && <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 26 }}>by {movie.director}</span>}
           </p>

           <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
             <div style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
               {movie.yearsAgo} Year{movie.yearsAgo !== 1 ? "s" : ""} Ago
             </div>
             
             {movie.rating ? (
                <span style={{ fontSize: 36, color: "#6ee7b7", letterSpacing: "0.1em", display: "inline-block", transform: "translateY(-4px)" }}>
                   {Array.from({ length: Math.floor(movie.rating) }).map(() => "★").join("")}{(movie.rating % 1 !== 0) ? "½" : ""}
                </span>
             ) : (
                <span style={{ fontSize: 18, color: "rgba(255,255,255,0.3)", display: "inline-block", transform: "translateY(-4px)" }}>
                   No rating given.
                </span>
             )}
           </div>
        </div>

      </div>
    </div>
  );
}
