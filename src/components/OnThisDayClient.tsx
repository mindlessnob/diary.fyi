"use client";

import { useState } from "react";
import { History, Star, ArrowRight } from "lucide-react";
import MovieModal from "./MovieModal";
import StoryModal from "./StoryModal";
import OnThisDayStoryCard from "./story/OnThisDayStoryCard";

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
  matches: MatchedMovie[];
  dateStr: string;
}

export default function OnThisDayClient({ matches, dateStr }: Props) {
  const [selectedMovie, setSelectedMovie] = useState<MatchedMovie | null>(null);
  const [shareStory, setShareStory] = useState(false);
  const [nickname, setNickname] = useState("you");

  import('react').then((React) => {
    // using useEffect securely without extra imports
  });
  
  // Fetch Nickname
  const ReactObj = require('react');
  ReactObj.useEffect(() => {
    fetch("/api/profile?v=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.displayName) setNickname(d.displayName);
      })
      .catch(() => {});
  }, []);

  const m = matches[0]; // Exactly one movie

  return (
    <div className="animate-fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--accent)", marginBottom: 8 }}>
            <History size={20} />
            <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>On This Day</h2>
          </div>
          <h1 style={{ fontSize: "clamp(28px, 6vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "var(--text)" }}>
            A Past Memory
          </h1>
        </div>
        
        {m && (
          <button 
            onClick={() => setShareStory(true)}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 8, 
              padding: "10px 16px", 
              background: "rgba(255,255,255,0.05)", 
              border: "1px solid rgba(255,255,255,0.1)", 
              borderRadius: 8, 
              color: "var(--text-2)", 
              fontWeight: 500,
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.color = "var(--text-2)";
            }}
          >
            Share to IG
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      {!m ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12 }}>
          <History size={48} style={{ color: "var(--text-3)", margin: "0 auto 16px", opacity: 0.5 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-2)" }}>Nothing found</h3>
          <p style={{ color: "var(--text-3)", marginTop: 8 }}>You haven't logged any films on this day in past years.</p>
        </div>
      ) : (
        <div style={{ 
          padding: "clamp(30px, 6vw, 60px)", 
          borderRadius: 24, 
          background: "var(--surface)", 
          border: "1px solid var(--border)", 
          position: "relative", 
          overflow: "hidden" 
        }}>
          {/* Blur background */}
          <div style={{ 
            position: "absolute", top: -100, left: -100, right: -100, bottom: -100,
            opacity: 0.15, 
            backgroundImage: m.poster ? `url(${m.poster})` : "none", 
            backgroundSize: "cover", 
            backgroundPosition: "center",
            filter: "blur(60px)",
            pointerEvents: "none"
          }} />

          <div style={{ 
            position: "relative", 
            zIndex: 1, 
            display: "flex", 
            gap: "clamp(30px, 8vw, 60px)", 
            alignItems: "center",
            flexWrap: "wrap-reverse"
          }}>
            {/* Left: Typography */}
            <div style={{ flex: "1 1 400px" }}>
              <p style={{ 
                fontSize: "clamp(24px, 4vw, 36px)", 
                fontWeight: 700, 
                lineHeight: 1.3, 
                letterSpacing: "-0.02em", 
                color: "var(--text)",
                margin: 0
              }}>
                <span style={{ color: "var(--text-3)", display: "block", marginBottom: 12, fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 600 }}>
                  Today, {m.yearsAgo} year{m.yearsAgo !== 1 ? "s" : ""} ago
                </span>
                
                <span style={{ color: "var(--accent)" }}>{nickname}</span> watched{" "}
                <span style={{ color: "#ffffff" }}>“{m.title}”</span>{" "}
                {m.director && <span style={{ color: "var(--text-2)" }}>by {m.director}</span>}{" "}
                
                {m.rating ? (
                  <span style={{ color: "#6ee7b7", display: "inline-block", marginTop: 12 }}>
                    and gave it {Array.from({ length: Math.floor(m.rating) }).map(() => "★").join("")}{(m.rating % 1 !== 0) ? "½" : ""}
                  </span>
                ) : (
                  <span style={{ color: "var(--text-3)", display: "inline-block", marginTop: 12 }}>
                    and left no rating.
                  </span>
                )}
              </p>
            </div>

            {/* Right: Poster */}
            <div 
              onClick={() => setSelectedMovie(m)}
              style={{ 
                width: "clamp(200px, 30vw, 280px)", 
                flexShrink: 0, 
                aspectRatio: "2/3", 
                borderRadius: 16, 
                overflow: "hidden", 
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)", 
                cursor: "pointer", 
                transition: "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)" 
              }}
              className="hover:rotate-2 hover:-translate-y-2"
            >
              {m.poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.poster} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={m.title} />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {m.title}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedMovie && (
         <MovieModal
           movies={[selectedMovie as any]}
           date={new Date(selectedMovie.watchedDate + "T12:00:00")}
           onClose={() => setSelectedMovie(null)}
         />
      )}

      {shareStory && m && (
        <StoryModal
          open={shareStory}
          onClose={() => setShareStory(false)}
          filename={`on-this-day-${dateStr.toLowerCase().replace(" ", "-")}.png`}
        >
          <OnThisDayStoryCard 
            movie={m} 
            dateStr={dateStr}
            nickname={nickname}
          />
        </StoryModal>
      )}
    </div>
  );
}
