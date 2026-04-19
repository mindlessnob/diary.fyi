import * as fs from "fs";
import * as path from "path";
import Link from "next/link";
import { ExternalLink, Film, Globe, Star, RefreshCcw, Clapperboard, Clock, Users, Calendar } from "lucide-react";
import ProfileShareButton from "@/components/ProfileShareButton";

// ─── Data loading (runs server-side, no HTTP hop) ──────────────────────────

const USERNAME = process.env.LETTERBOXD_USER || "lboxd";

async function loadProfile() {
  // 1. Stats from lifetime.json
  const cachePath = path.join(process.cwd(), "src", "data", "lifetime.json");
  let totalFilms      = 0;
  let totalRewatches  = 0;
  let totalRuntime    = 0;
  let ratingSum       = 0;
  let ratingCount     = 0;
  const uniqueGenres    = new Set<string>();
  const uniqueCountries = new Set<string>();
  const uniqueDirs      = new Set<string>();
  const watchYears      = new Set<string>();
  let firstWatched = "";
  let lastWatched  = "";

  if (fs.existsSync(cachePath)) {
    const raw: any[] = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    raw.forEach((m) => {
      if (!m.watchedDate) return;
      totalFilms++;
      if (m.isRewatch) totalRewatches++;
      if (m.runtime)   totalRuntime += m.runtime;
      if (m.rating)    { ratingSum += m.rating; ratingCount++; }
      (m.genres    || []).forEach((g: string) => uniqueGenres.add(g));
      (m.countries || []).forEach((c: string) => uniqueCountries.add(c));
      (m.directors || []).forEach((d: string) => uniqueDirs.add(d));
      watchYears.add(m.watchedDate.slice(0, 4));
    });
    const dated = raw.filter((m) => m.watchedDate).map((m) => m.watchedDate).sort();
    if (dated.length) { firstWatched = dated[0]; lastWatched = dated[dated.length - 1]; }
  }

  // 2. Best-effort Letterboxd profile scrape
  let displayName = process.env.LETTERBOXD_USER || "lboxd";
  let avatar       = "";
  let bio          = "";
  let followers    = "—";
  let following    = "—";
  let memberSince  = "";
  let filmsWatched = 0;
  interface RecentWatch { title: string; year: string; rating: number | null; poster: string; watchedDate: string; }
  let recentWatches: RecentWatch[] = [];
  try {
    const rssRes = await fetch(`https://letterboxd.com/${USERNAME}/rss/`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
    });
    if (rssRes.ok) {
      const rssXml = await rssRes.text();
      const items = rssXml.match(/<item>[\s\S]*?<\/item>/g) || [];
      recentWatches = items.slice(0, 4).map((item) => {
        const titleM  = item.match(/<letterboxd:filmTitle>([^<]+)<\/letterboxd:filmTitle>/);
        const yearM   = item.match(/<letterboxd:filmYear>([^<]+)<\/letterboxd:filmYear>/);
        const ratingM = item.match(/<letterboxd:memberRating>([^<]+)<\/letterboxd:memberRating>/);
        const posterM = item.match(/<img src="([^"]+)"/);
        const dateM   = item.match(/<letterboxd:watchedDate>([^<]+)<\/letterboxd:watchedDate>/);
        return {
          title:       titleM  ? titleM[1].replace(/&amp;/g, "&").replace(/&#039;/g, "'") : "Unknown",
          year:        yearM   ? yearM[1] : "",
          rating:      ratingM ? parseFloat(ratingM[1]) : null,
          poster:      posterM ? posterM[1] : "",
          watchedDate: dateM   ? dateM[1] : "",
        };
      });
    }
  } catch {
    // non-critical
  }
  const favorites: { slug: string; title: string; year: string; poster: string }[] = [];

  try {
    const res = await fetch(`https://letterboxd.com/${USERNAME}/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const html = await res.text();

      // Avatar
      const avatarM = html.match(/src="(https:\/\/a\.ltrbxd\.com\/resized\/avatar[^"]+)"/);
      if (avatarM) avatar = avatarM[1];

      // og:description format: "[Name] uses Letterboxd to share... Bio: [actual bio]."
      const ogDescM = html.match(/property="og:description"\s+content="([^"]+)"/i) ||
                      html.match(/content="([^"]+)"\s+property="og:description"/i);

      if (ogDescM) {
        const raw = ogDescM[1]
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">");

        // "[Name] uses Letterboxd..." → extract display name
        const nameM = raw.match(/^(.+?)\s+uses Letterboxd/i);
        if (nameM) displayName = nameM[1].trim();

        // "X films watched" → extract total watched count
        const watchedM = raw.match(/([\d,]+)\s+films?\s+watched/i);
        if (watchedM) filmsWatched = parseInt(watchedM[1].replace(/,/g, ""), 10);

        // "Bio: [text]." → extract actual bio
        const bioM = raw.match(/\bBio:\s+(.+)$/i);
        if (bioM) bio = bioM[1].trim().replace(/\.$/, "");
      }

      // Followers / following
      const followM = html.match(/\/followers\/"[^>]*>[\s\S]{0,300}?<\/a>/);
      if (followM) { const n = followM[0].match(/>([\d,]+)</); if (n) followers = n[1]; }

      const followingM = html.match(/\/following\/"[^>]*>[\s\S]{0,300}?<\/a>/);
      if (followingM) { const n = followingM[0].match(/>([\d,]+)</); if (n) following = n[1]; }

      // Member since
      const sinceM = html.match(/Member\s+(?:since\s+)?(\w+ \d{4})/i);
      if (sinceM) memberSince = sinceM[1];
      // ── Load favorites from favorites.json (edited via /admin UI) ────────
      const favsPath = path.join(process.cwd(), "src", "data", "favorites.json");
      if (fs.existsSync(favsPath)) {
        const stored: { title: string; year: string; slug: string; posterOverride: string }[] =
          JSON.parse(fs.readFileSync(favsPath, "utf-8"));

        const apiKey = process.env.TMDB_API_KEY;

        await Promise.all(
          stored.map(async (fav) => {
            if (fav.posterOverride) {
              // Admin has set a manual override — use it directly
              favorites.push({ slug: fav.slug, title: fav.title, year: fav.year, poster: fav.posterOverride });
            } else if (apiKey) {
              // Fall back to TMDB auto-match
              try {
                const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(fav.title)}&year=${fav.year}&page=1`;
                const tmdbRes  = await fetch(url, { next: { revalidate: 3600 } });
                const tmdbData = await tmdbRes.json();
                const hit = tmdbData.results?.[0];
                favorites.push({
                  slug:   fav.slug,
                  title:  fav.title,
                  year:   fav.year,
                  poster: hit?.poster_path ? `https://image.tmdb.org/t/p/w342${hit.poster_path}` : "",
                });
              } catch {
                favorites.push({ slug: fav.slug, title: fav.title, year: fav.year, poster: "" });
              }
            } else {
              favorites.push({ slug: fav.slug, title: fav.title, year: fav.year, poster: "" });
            }
          })
        );
      }
    }
  } catch {
    // Non-critical — fall back to computed stats only
  }

  return {
    displayName,
    avatar,
    bio,
    followers,
    following,
    memberSince,
    filmsWatched,
    favorites,
    recentWatches,
    profileUrl: `https://letterboxd.com/${USERNAME}/`,
    stats: {
      totalFilms,
      totalRewatches,
      totalHours:      Math.round(totalRuntime / 60),
      avgRating:       ratingCount > 0 ? (ratingSum / ratingCount).toFixed(2) : null,
      uniqueGenres:    uniqueGenres.size,
      uniqueCountries: uniqueCountries.size,
      uniqueDirectors: uniqueDirs.size,
      yearsLogging:    watchYears.size,
      firstWatched,
      lastWatched,
    },
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString(); }

function dateLabel(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export const metadata = {
  title: `${USERNAME} · Profile`,
  description: `Film diary profile for ${USERNAME} — stats, favorites, and watch history.`,
};

export const revalidate = 3600;

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function ProfilePage() {
  const profile = await loadProfile();
  const { stats } = profile;

  const statCards = [
    { icon: <Film size={15} />,        label: "Films Watched",  value: profile.filmsWatched > 0 ? fmt(profile.filmsWatched) : fmt(stats.totalFilms), sub: "on Letterboxd",                                              color: "#4da6ff" },
    { icon: <Clock size={15} />,       label: "Watch Time",     value: `${fmt(stats.totalHours)} hrs`,  sub: `≈ ${(stats.totalHours / 24).toFixed(0)} days`,                 color: "#6ee7b7" },
    { icon: <Star size={15} />,        label: "Avg Rating",     value: stats.avgRating ? `${stats.avgRating} ★` : "—", sub: "out of 5.0",                                    color: "#e5b94b" },
    { icon: <RefreshCcw size={15} />,  label: "Rewatches",      value: fmt(stats.totalRewatches),       sub: `${stats.totalFilms > 0 ? ((stats.totalRewatches / stats.totalFilms) * 100).toFixed(0) : 0}% of diary`, color: "#e882a1" },
    { icon: <Globe size={15} />,       label: "Countries",      value: fmt(stats.uniqueCountries),      sub: "of production",                                               color: "#a78bfa" },
    { icon: <Clapperboard size={15} />,label: "Directors",      value: fmt(stats.uniqueDirectors),      sub: "unique filmmakers",                                           color: "#fb923c" },
    { icon: <Users size={15} />,       label: "Genres",         value: fmt(stats.uniqueGenres),         sub: "catalogued",                                                  color: "#34d399" },
    { icon: <Calendar size={15} />,    label: "Diary Entries",  value: fmt(stats.totalFilms),           sub: "with watch date",                                             color: "#60a5fa" },
  ];

  const shareFilmsWatched = profile.filmsWatched > 0 ? profile.filmsWatched : stats.totalFilms;

  return (
    <div style={{ minHeight: "calc(100dvh - 52px)", background: "var(--bg)" }}>
      {/* ── Mobile responsive styles ─────────────────────────── */}
      <style>{`
        .profile-wrap   { padding: clamp(16px,5vw,48px) clamp(12px,4vw,40px) 80px; }
        .profile-card-inner { padding: 20px; }
        .profile-fav-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
        .profile-grid   { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
        .profile-hdr    { display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap; margin-bottom:16px; }
        .profile-lb-btn { align-self:flex-start; }
        @media(max-width:600px) {
          .profile-card-inner { padding: 16px; }
          .profile-fav-grid   { grid-template-columns:repeat(2,1fr); gap:6px; }
          .profile-grid       { grid-template-columns:repeat(2,1fr); }
          .profile-hdr        { flex-direction:column; gap:12px; }
          .profile-lb-btn     { width:100%; justify-content:center; }
        }
        @media(max-width:360px) {
          .profile-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="profile-wrap" style={{ maxWidth: 720, margin: "0 auto" }} >

        {/* ── Share button row ─────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <ProfileShareButton
            displayName={profile.displayName}
            username={USERNAME}
            avatar={profile.avatar}
            filmsWatched={shareFilmsWatched}
            totalHours={stats.totalHours}
            avgRating={stats.avgRating ?? "—"}
            diaryEntries={stats.totalFilms}
            uniqueCountries={stats.uniqueCountries}
            uniqueDirectors={stats.uniqueDirectors}
            rewatchPct={stats.totalFilms > 0 ? Math.round((stats.totalRewatches / stats.totalFilms) * 100) : 0}
            favorites={profile.favorites}
            recentWatches={profile.recentWatches}
          />
        </div>

        {/* ── Profile card ─────────────────────────────────────── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
          <div className="profile-card-inner">
            {/* Avatar + name row — always flex-row on all screen sizes */}
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              {/* Avatar */}
              <div style={{ width: 68, height: 68, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "2px solid var(--border-2)", background: "var(--surface-2)" }}>
                {profile.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar} alt={profile.displayName} width={68} height={68}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🎬</div>
                )}
              </div>

              {/* Name + meta + link pills */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: "clamp(16px,4vw,24px)", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.025em", margin: 0, marginBottom: 3 }}>
                  {profile.displayName}
                </h1>
                <p style={{ fontSize: 12, color: "var(--text-3)", margin: "0 0 10px", lineHeight: 1.4 }}>
                  @{USERNAME}
                  {profile.memberSince && <span style={{ marginLeft: 6 }}>· Member since {profile.memberSince}</span>}
                </p>

                {/* Followers / Following */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                  {[{ label: "Followers", value: profile.followers }, { label: "Following", value: profile.following }].map(({ label, value }) => (
                    <div key={label}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>{value}</span>
                      <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: 4 }}>{label}</span>
                    </div>
                  ))}
                </div>

                {/* External link pills */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4, marginBottom: 16 }}>
                  <a href={profile.profileUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "rgba(46,170,220,0.12)", border: "1px solid rgba(46,170,220,0.28)", color: "#2eaadc", textDecoration: "none" }}>
                    Letterboxd <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p style={{ fontSize: 13, lineHeight: 1.75, color: "var(--text-2)", margin: 0, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* ── Favorite Films ───────────────────────────────────── */}
        {profile.favorites.length > 0 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 10 }}>Favorite Films</div>
            <div className="profile-fav-grid">
              {profile.favorites.map((fav) => (
                <a key={fav.slug} href={`https://letterboxd.com/film/${fav.slug}/`} target="_blank" rel="noopener noreferrer" title={fav.title}
                  style={{ display: "block", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", position: "relative", textDecoration: "none", aspectRatio: "2/3" }}>
                  {fav.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fav.poster} alt={fav.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 11 }}>?</div>
                  )}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.82))", padding: "24px 8px 8px", fontSize: 10, color: "rgba(255,255,255,0.88)", lineHeight: 1.35 }}>
                    {fav.title}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Stat cards ───────────────────────────────────────── */}
        <div className="profile-grid" style={{ marginBottom: 10 }}>
          {statCards.map(({ icon, label, value, sub }) => (
            <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8, color: "var(--text-3)" }}>
                {icon}
                <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)" }}>{label}</span>
              </div>
              <div style={{ fontSize: "clamp(18px,3.5vw,24px)", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 3 }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Activity span ─────────────────────────────────────── */}
        {stats.firstWatched && stats.lastWatched && (
          <div style={{ marginTop: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            {[{ label: "First diary entry", value: dateLabel(stats.firstWatched) }, { label: "Most recent entry", value: dateLabel(stats.lastWatched) }].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Nav ───────────────────────────────────────────────── */}
        <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[{ href: "/", label: "← Calendar" }, { href: "/stats", label: "Insights →" }].map(({ href, label }) => (
            <Link key={href} href={href}
              style={{ fontSize: 13, color: "var(--text-2)", padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)" }}>
              {label}
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
