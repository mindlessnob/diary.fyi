"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Download } from "lucide-react";
import { InstagramIcon } from "./InstagramIcon";

interface Props {
  open:       boolean;
  onClose:    () => void;
  filename:   string;
  children:   React.ReactNode;   // the story card at 540×960
}

const CARD_W = 540;
const CARD_H = 960;

export default function StoryModal({ open, onClose, filename, children }: Props) {
  const cardRef    = useRef<HTMLDivElement>(null);
  const [busy,     setBusy]    = useState(false);
  const [done,     setDone]    = useState(false);
  const [mounted,  setMounted] = useState(false);

  const [scale,    setScale]   = useState(0.38);

  // Mark client mount
  useEffect(() => setMounted(true), []);

  // Close on Escape & calculate responsive scale
  useEffect(() => {
    const updateScale = () => {
      if (window.innerWidth > 768 && window.innerHeight > 850) {
        setScale(0.65); // Large desktop
      } else if (window.innerHeight > 700) {
        setScale(0.48); // Standard mobile/desktop height
      } else {
        setScale(0.38); // iPhone SE / short displays
      }
    };
    
    updateScale();
    window.addEventListener("resize", updateScale);
    
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    
    return () => {
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const download = useCallback(async () => {
    if (!cardRef.current || busy) return;
    setBusy(true);
    setDone(false);
    try {
      // Dynamic import so html2canvas isn't in the initial bundle
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale:           2,          // → 1080×1920 output
        useCORS:         true,
        allowTaint:      false,
        logging:         false,
        backgroundColor: "#0e0e0e",
        width:           CARD_W,
        height:          CARD_H,
      });
      const link      = document.createElement("a");
      link.download   = `${filename}.png`;
      link.href       = canvas.toDataURL("image/png");
      link.click();
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      console.error("Story download failed", err);
    } finally {
      setBusy(false);
    }
  }, [busy, filename]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         9999,
        background:     "rgba(0,0,0,0.85)",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "flex-start",
        overflowY:      "auto",
        padding:        "24px 16px 40px",
        backdropFilter: "blur(6px)",
      }}
    >
      {/* ── Top bar ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1 }}>
          <InstagramIcon size={16} style={{ color: "rgba(255,255,255,0.5)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
            Instagram Story
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: 4, padding: "2px 6px" }}>
            1080 × 1920
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)", flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Card preview ────────────────────────────────── */}
      <div style={{
        width:         Math.round(CARD_W * scale),
        height:        Math.round(CARD_H * scale),
        overflow:      "hidden",
        borderRadius:  14,
        border:        "1px solid rgba(255,255,255,0.1)",
        boxShadow:     "0 24px 80px rgba(0,0,0,0.6)",
        flexShrink:    0,
        position:      "relative",
        transition:    "width 0.2s, height 0.2s"
      }}>
        <div
          style={{
            width:           CARD_W,
            height:          CARD_H,
            transform:       `scale(${scale})`,
            transformOrigin: "top left",
            transition:      "transform 0.2s"
          }}
        >
          {children}
        </div>
      </div>

      {/* ── Hidden full-size capture node ───────────────── */}
      {/* 
        html2canvas struggles with capturing CSS transformed elements. 
        Instead of the buggy onclone scale reset, we render a pure, unscaled 
        version off-screen strictly for html2canvas to capture cleanly. 
      */}
      <div style={{ position: "fixed", top: -9999, left: -9999 }}>
        <div ref={cardRef} style={{ width: CARD_W, height: CARD_H }}>
          {children}
        </div>
      </div>

      {/* ── Download button ──────────────────────────────── */}
      <button
        onClick={download}
        disabled={busy}
        style={{
          marginTop:    18,
          display:      "flex",
          alignItems:   "center",
          gap:          8,
          padding:      "11px 28px",
          borderRadius: 10,
          background:   done
            ? "rgba(110,231,183,0.18)"
            : busy
            ? "rgba(255,255,255,0.06)"
            : "rgba(255,255,255,0.1)",
          color:        done ? "#6ee7b7" : busy ? "rgba(255,255,255,0.35)" : "#ffffff",
          fontSize:     14,
          fontWeight:   600,
          cursor:       busy ? "not-allowed" : "pointer",
          transition:   "all 0.15s",
          letterSpacing: "0.01em",
          border: `1px solid ${done ? "rgba(110,231,183,0.25)" : "rgba(255,255,255,0.12)"}`,
        }}
      >
        <Download size={15} />
        {busy ? "Generating…" : done ? "Saved! Upload to Instagram Stories" : "Download PNG"}
      </button>

      <p style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 1.5 }}>
        Save to your camera roll → open Instagram → tap + → Story → select image
      </p>
    </div>,
    document.body
  );
}
