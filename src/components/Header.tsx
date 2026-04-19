"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";

const NAV = [
  { href: "/",            label: "Calendar"     },
  { href: "/stats",       label: "Insights"     },
  { href: "/year",        label: "Year in Film" },
  { href: "/on-this-day", label: "On This Day"  },
  { href: "/profile",     label: "Profile"      },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <style>{`
        .hdr-wordmark { display: flex; align-items: center; gap: 6px; }
        .hdr-subtitle { display: inline; }

        /* Desktop nav */
        .hdr-nav-desktop { display: flex; gap: 2px; align-items: center; }
        .hdr-hamburger   { display: none; }

      .hdr-header {
          color-scheme: dark;
        }
        .hdr-ham-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          border-radius: 6px;
        }
        .hdr-ham-btn span {
          display: block;
          width: 20px;
          height: 2px;
          background: rgba(255,255,255,0.65) !important;
          border-radius: 2px;
          transition: transform 0.2s, opacity 0.2s;
        }
        .hdr-ham-btn.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hdr-ham-btn.open span:nth-child(2) { opacity: 0; }
        .hdr-ham-btn.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        .hdr-link {
          padding: 4px 9px;
          border-radius: 4px;
          font-size: 13px;
          transition: background 0.12s;
          white-space: nowrap;
          text-decoration: none;
        }
        .hdr-link:hover { background: var(--surface-2) !important; }

        /* Mobile drawer overlay */
        .hdr-drawer-overlay {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 39;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          animation: fadeIn 0.15s ease;
        }
        .hdr-drawer {
          display: none;
          position: fixed;
          top: 48px;
          right: 0;
          bottom: 0;
          width: min(240px, 75vw);
          z-index: 41;
          background: #111;
          border-left: 1px solid rgba(255,255,255,0.06);
          flex-direction: column;
          padding: 16px 0;
          animation: slideIn 0.18s ease;
        }
        .hdr-drawer a {
          display: block;
          padding: 13px 24px;
          font-size: 15px;
          font-weight: 500;
          color: var(--text-2);
          text-decoration: none;
          border-left: 2px solid transparent;
          transition: background 0.1s, color 0.1s, border-color 0.1s;
        }
        .hdr-drawer a:hover { background: rgba(255,255,255,0.04); color: var(--text); }
        .hdr-drawer a.active { color: var(--text); font-weight: 700; border-left-color: var(--accent); background: rgba(46,170,220,0.06); }

        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

        @media (max-width: 620px) {
          .hdr-nav-desktop { display: none; }
          .hdr-hamburger   { display: flex; }
          .hdr-subtitle    { display: none; }
        }

        @media (max-width: 380px) {
          .hdr-wordmark span:last-child { display: none; }
        }
      `}</style>

      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "var(--bg)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        colorScheme: "dark",
      }}>
        <div style={{
          padding: "0 12px",
          height: 48,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          {/* Logo */}
          <span style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 28, flexShrink: 0,
            borderRadius: "50%", overflow: "hidden",
            background: "var(--surface-2)",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Logo"
              width={28}
              height={28}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "none", colorScheme: "dark" }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </span>

          {/* Wordmark */}
          <div className="hdr-wordmark">
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", userSelect: "none", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
              diary.fyi
            </span>
            <span className="hdr-subtitle" style={{ fontSize: 14, color: "var(--text-3)", userSelect: "none" }}>·</span>
            <span className="hdr-subtitle" style={{ fontSize: 13, fontWeight: 500, color: "var(--text-3)", userSelect: "none", whiteSpace: "nowrap" }}>
              film diary
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hdr-nav-desktop" style={{ marginLeft: "auto" }}>
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="hdr-link"
                style={{
                  fontWeight:  pathname === href ? 600 : 400,
                  background:  pathname === href ? "var(--hover)" : "transparent",
                  color:       pathname === href ? "var(--text)" : "var(--text-2)",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Hamburger (mobile) */}
          <button
            className={`hdr-hamburger hdr-ham-btn${menuOpen ? " open" : ""}`}
            style={{ marginLeft: "auto" }}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <div
          className="hdr-drawer-overlay"
          style={{ display: "block" }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <nav
        className="hdr-drawer"
        style={{ display: menuOpen ? "flex" : "none" }}
        aria-hidden={!menuOpen}
      >
        {/* Drawer header */}
        <div style={{ padding: "4px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)" }}>
            Navigation
          </div>
        </div>

        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? "active" : ""}
          >
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
