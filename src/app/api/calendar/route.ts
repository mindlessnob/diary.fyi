import { NextResponse } from "next/server";
import { parseRss } from "@/lib/parseRss";
import { applyOverrides } from "@/lib/applyOverrides";

const USERNAME = process.env.LETTERBOXD_USER || "lboxd";

// Cache at CDN for 5 minutes — frequent enough to catch new diary entries,
// fast enough to not hammer Letterboxd or the serverless function.
export const revalidate = 300;

interface CalendarEntry {
  slug: string;
  title: string;
  year: number | null;
  poster: string;
  watchedDate: string | null;
  rating: number | null;
  isRewatch: boolean;
  review: string; // only populated for the latest 50 RSS entries
  link: string;
}

export async function GET() {
  try {
    // 1. Read the slim fields from lifetime.json
    // Using require() with a static string so both webpack and Turbopack
    // can statically detect and bundle the file into the Vercel serverless
    // function. The old fs.readFileSync(path.join(process.cwd(), ...))
    // approach uses a dynamic path that Turbopack cannot trace.
    let calendarEntries: CalendarEntry[] = [];

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const raw: any[] = require("@/data/lifetime.json");
      calendarEntries = raw
        .filter((m) => m.watchedDate)
        .map((m) => ({
          slug:        m.slug,
          title:       m.title,
          year:        m.year ?? null,
          poster:      m.poster ?? "",
          watchedDate: m.watchedDate ?? null,
          rating:      m.rating ?? null,
          isRewatch:   m.isRewatch ?? false,
          review:      "",
          link:        m.slug ? `https://letterboxd.com/${USERNAME}/film/${m.slug}/` : "",
        }));
    } catch {
      // File not bundled or missing — fall through to RSS-only mode
    }

    // 2. Merge RSS entries so brand-new logs appear immediately
    try {
      const rssRes = await fetch(`https://letterboxd.com/${USERNAME}/rss/`, {
        next: { revalidate: 300 }, // cache for 5 min
      });
      if (rssRes.ok) {
        const xml = await rssRes.text();
        const rssMovies = parseRss(xml);

        const existingSlugs = new Set(calendarEntries.map((e) => e.slug));

        for (const fm of rssMovies) {
          const slugMatch = fm.link.match(/\/film\/([^/]+)\//);
          const slug = slugMatch ? slugMatch[1] : "";

          if (slug && !existingSlugs.has(slug)) {
            // Brand new film not in lifetime.json yet — add it with RSS data
            calendarEntries.push({
              slug,
              title:       fm.title,
              year:        fm.year ? parseInt(fm.year, 10) : null,
              poster:      fm.poster ?? "",
              watchedDate: fm.watchedDate ?? null,
              rating:      fm.rating,
              isRewatch:   fm.isRewatch,
              review:      fm.review ?? "",
              link:        fm.link ?? "",
            });
          } else if (slug) {
            // Already exists — overlay latest RSS data (rating, review, etc.)
            const entry = calendarEntries.find((e) => e.slug === slug);
            if (entry) {
              if (fm.rating !== null)           entry.rating      = fm.rating;
              if (fm.watchedDate)               entry.watchedDate = fm.watchedDate;
              if (fm.isRewatch)                 entry.isRewatch   = true;
              if (!entry.poster && fm.poster)   entry.poster      = fm.poster;
              if (fm.review)                    entry.review      = fm.review;
              if (fm.link)                      entry.link        = fm.link;
            }
          }
        }
      }
    } catch {
      // RSS failure is non-critical — serve historical data
    }

    // 3. Apply poster / title overrides from overrides.json
    calendarEntries = applyOverrides(calendarEntries) as typeof calendarEntries;

    // Sort newest first
    calendarEntries.sort((a, b) => {
      const da = a.watchedDate ? new Date(a.watchedDate).getTime() : 0;
      const db = b.watchedDate ? new Date(b.watchedDate).getTime() : 0;
      return db - da;
    });

    return NextResponse.json({ movies: calendarEntries });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load calendar data." }, { status: 500 });
  }
}
