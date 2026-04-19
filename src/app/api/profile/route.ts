import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const revalidate = 3600; // 1 hour

const USERNAME = process.env.LETTERBOXD_USER || "lboxd";

export async function GET() {
  try {
    // ── 1. Best-effort Letterboxd profile scrape ──────────────────
    let displayName = process.env.LETTERBOXD_USER || "lboxd";
    let avatar      = "";
    let bio         = "";
    let followers   = "—";
    let following   = "—";
    let memberSince = "";

    // ── RSS: last 4 watched ────────────────────────────────────────
    interface RecentWatch { title: string; year: string; rating: number | null; poster: string; }
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
          return {
            title:  titleM  ? titleM[1].replace(/&amp;/g, "&").replace(/&#039;/g, "'") : "Unknown",
            year:   yearM   ? yearM[1]   : "",
            rating: ratingM ? parseFloat(ratingM[1]) : null,
            poster: posterM ? posterM[1] : "",
          };
        });
      }
    } catch {
      // non-critical
    }

    try {
      const profileRes = await fetch(`https://letterboxd.com/${USERNAME}/?v=1`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
        next: { revalidate: 3500 },
      });

      if (profileRes.ok) {
        const html = await profileRes.text();

        // Avatar — hosted on a.ltrbxd.com
        const avatarM = html.match(/src="(https:\/\/a\.ltrbxd\.com\/resized\/avatar[^"]+)"/);
        if (avatarM) avatar = avatarM[1];

        // Display name — <meta property="og:title" content="moon's profile">
        const nameM =
          html.match(/<meta\s+property="og:title"\s+content="([^"]+?)(?:'|’|&#39;)s\s+profile"/i) ||
          html.match(/<span[^>]+class="name"[^>]*>([^<]+)<\/span>/);
        if (nameM) displayName = nameM[1].trim();

        // Bio
        const bioM = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
        if (bioM) {
          const rawDesc = bioM[1];
          const bioStr = rawDesc.split("Bio: ")[1];
          if (bioStr) bio = bioStr.trim();
        }

        // Followers / following
        const followM = html.match(/\/followers\/"[^>]*>[\s\S]{0,200}?<\/a>/);
        if (followM) {
          const n = followM[0].match(/>([\d,]+)</);
          if (n) followers = n[1];
        }
        const followingM = html.match(/\/following\/"[^>]*>[\s\S]{0,200}?<\/a>/);
        if (followingM) {
          const n = followingM[0].match(/>([\d,]+)</);
          if (n) following = n[1];
        }

        // Member since
        const sinceM = html.match(/Member\s+(?:since\s+)?(\w+ \d{4})/i);
        if (sinceM) memberSince = sinceM[1];
      }
    } catch {
      // Non-critical – fall back to computed data only
    }

    // ── 2. Stats from lifetime.json ───────────────────────────────
    let totalFilms       = 0;
    let totalRewatches   = 0;
    let totalRuntime     = 0;
    let ratingSum        = 0;
    let ratingCount      = 0;
    const uniqueGenres    = new Set<string>();
    const uniqueCountries = new Set<string>();
    const uniqueDirs      = new Set<string>();
    const watchYears      = new Set<string>();
    let firstWatched = "";
    let lastWatched  = "";

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const raw: any[] = require("@/data/lifetime.json");

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

      const dated = raw
        .filter((m) => m.watchedDate)
        .map((m) => m.watchedDate)
        .sort();
      if (dated.length) {
        firstWatched = dated[0];
        lastWatched  = dated[dated.length - 1];
      }
    } catch {
      // File missing or not bundled in Vercel
    }

    return NextResponse.json({
      username: USERNAME,
      displayName,
      avatar,
      bio,
      followers,
      following,
      memberSince,
      profileUrl: `https://letterboxd.com/${USERNAME}/`,
      recentWatches,
      stats: {
        totalFilms,
        totalRewatches,
        totalHours:       Math.round(totalRuntime / 60),
        avgRating:        ratingCount > 0 ? (ratingSum / ratingCount).toFixed(2) : null,
        uniqueGenres:     uniqueGenres.size,
        uniqueCountries:  uniqueCountries.size,
        uniqueDirectors:  uniqueDirs.size,
        yearsLogging:     watchYears.size,
        firstWatched,
        lastWatched,
      },
    });
  } catch (err: any) {
    console.error("[profile]", err);
    return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
  }
}
