import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// ─── Config ───────────────────────────────────────────────────────────────────
const TMDB_KEY   = process.env.TMDB_API_KEY;
const USERNAME   = process.env.LETTERBOXD_USER || "lboxd";
const DATA_DIR   = path.join(process.cwd(), "src", "data");
const CACHE_FILE = path.join(DATA_DIR, "lifetime.json");

// Dynamically find the Letterboxd export directory
const exportDirs = fs.readdirSync(process.cwd()).filter(f => fs.statSync(f).isDirectory() && f.startsWith("letterboxd-") && f.endsWith("-utc"));
const EXPORT_DIR = exportDirs.length > 0 ? path.join(process.cwd(), exportDirs[0]) : "";

const TMDB_IMG   = "https://image.tmdb.org/t/p/w342";
const TMDB_BASE  = "https://api.themoviedb.org/3";

if (!TMDB_KEY) {
  console.error("❌  TMDB_API_KEY environment variable is not set.");
  process.exit(1);
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StaticMovie {
  slug:        string;
  title:       string;
  year:        number | null;
  runtime:     number;
  decade:      string | null;
  languages:   string[];
  countries:   string[];
  genres:      string[];
  directors:   string[];
  actors:      string[];
  rating:      number | null;
  watchedDate: string | null;
  isRewatch:   boolean;
  poster:      string;   // ← TMDB poster URL, full absolute
  tmdbId:      number | null;
}

// ─── TMDB helpers ─────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function tmdbSearch(title: string, year: number | null): Promise<number | null> {
  const q = encodeURIComponent(title);
  const yearParam = year ? `&year=${year}` : "";
  const url = `${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${q}${yearParam}&include_adult=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results?.length) return null;
    // Prefer exact year match if available
    if (year) {
      const exact = data.results.find((r: any) => r.release_date?.startsWith(String(year)));
      if (exact) return exact.id;
    }
    return data.results[0].id;
  } catch {
    return null;
  }
}

async function tmdbDetails(id: number): Promise<any> {
  const url = `${TMDB_BASE}/movie/${id}?api_key=${TMDB_KEY}&append_to_response=credits`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function buildMovieFromTmdb(base: Partial<StaticMovie>, details: any): StaticMovie {
  const directors = (details.credits?.crew ?? [])
    .filter((c: any) => c.job === "Director")
    .map((c: any) => c.name as string);

  const actors = (details.credits?.cast ?? [])
    .slice(0, 15)
    .map((c: any) => c.name as string);

  const genres = (details.genres ?? []).map((g: any) => g.name as string);

  const countries = (details.production_countries ?? []).map((c: any) => c.name as string);

  const languages = (details.spoken_languages ?? []).map((l: any) =>
    l.english_name === "No Language" ? "None" : (l.english_name as string)
  );

  const year = base.year || (details.release_date ? parseInt(details.release_date.slice(0, 4), 10) : null);

  return {
    slug:        base.slug || "",
    title:       base.title || details.title || "",
    year,
    runtime:     details.runtime ?? 0,
    decade:      year ? `${Math.floor(year / 10) * 10}s` : null,
    languages,
    countries,
    genres,
    directors,
    actors,
    rating:      base.rating ?? null,
    watchedDate: base.watchedDate ?? null,
    isRewatch:   base.isRewatch ?? false,
    poster:      details.poster_path ? `${TMDB_IMG}${details.poster_path}` : "",
    tmdbId:      details.id ?? null,
  };
}

// ─── RSS fetch ────────────────────────────────────────────────────────────────
async function fetchRssSlugs(): Promise<{ slug: string; title: string; year: string; rating: number | null; watchedDate: string; isRewatch: boolean; poster: string }[]> {
  try {
    const res = await fetch(`https://letterboxd.com/${USERNAME}/rss/`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const items: any[] = [];
    const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

    for (const block of itemBlocks) {
      const linkMatch    = block.match(/<link>([^<]+)<\/link>/);
      const titleMatch   = block.match(/<letterboxd:filmTitle>([^<]+)<\/letterboxd:filmTitle>/);
      const yearMatch    = block.match(/<letterboxd:filmYear>([^<]+)<\/letterboxd:filmYear>/);
      const ratingMatch  = block.match(/<letterboxd:memberRating>([^<]+)<\/letterboxd:memberRating>/);
      const dateMatch    = block.match(/<letterboxd:watchedDate>([^<]+)<\/letterboxd:watchedDate>/);
      const rewatchMatch = block.match(/<letterboxd:rewatch>([^<]+)<\/letterboxd:rewatch>/);
      const posterMatch  = block.match(/src="(https:\/\/a\.ltrbxd\.com\/[^"]+)"/);

      const linkUrl = linkMatch?.[1]?.trim();
      const slug = linkUrl ? linkUrl.match(/\/film\/([^\/]+)\//)?.[1] : null;
      if (!slug) continue;

      items.push({
        slug,
        title:       titleMatch?.[1]?.trim()  ?? "",
        year:        yearMatch?.[1]?.trim()   ?? "",
        rating:      ratingMatch  ? parseFloat(ratingMatch[1]) : null,
        watchedDate: dateMatch?.[1]?.trim()   ?? "",
        isRewatch:   rewatchMatch?.[1]?.trim().toLowerCase() === "yes",
        poster:      posterMatch?.[1] ?? "",
      });
    }

    return items;
  } catch {
    return [];
  }
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────
function loadCsvData() {
  const genKey = (title: string, year: any) => `${String(title).toLowerCase().trim()}||${year ?? ""}`;
  const unified = new Map<string, { title: string; year: number | null; rating: number | null; watchedDate: string | null; isRewatch: boolean; uri: string }>();

  if (!fs.existsSync(EXPORT_DIR)) return unified;

  const watchedRaw = fs.readFileSync(path.join(EXPORT_DIR, "watched.csv"), "utf-8");
  const ratingsRaw = fs.readFileSync(path.join(EXPORT_DIR, "ratings.csv"), "utf-8");
  const diaryRaw   = fs.readFileSync(path.join(EXPORT_DIR, "diary.csv"),   "utf-8");

  const watched = parse(watchedRaw, { columns: true, skip_empty_lines: true });
  const ratings = parse(ratingsRaw, { columns: true, skip_empty_lines: true });
  const diary   = parse(diaryRaw,   { columns: true, skip_empty_lines: true });

  for (const row of watched) {
    unified.set(genKey(row["Name"], row["Year"]), { title: row["Name"], year: parseInt(row["Year"]) || null, rating: null, watchedDate: null, isRewatch: false, uri: row["Letterboxd URI"] });
  }
  for (const row of ratings) {
    const k = genKey(row["Name"], row["Year"]);
    if (!unified.has(k)) unified.set(k, { title: row["Name"], year: parseInt(row["Year"]) || null, rating: null, watchedDate: null, isRewatch: false, uri: row["Letterboxd URI"] });
    unified.get(k)!.rating = parseFloat(row["Rating"]);
  }
  for (const row of diary) {
    const k = genKey(row["Name"], row["Year"]);
    if (!unified.has(k)) unified.set(k, { title: row["Name"], year: parseInt(row["Year"]) || null, rating: null, watchedDate: null, isRewatch: false, uri: row["Letterboxd URI"] });
    const d = unified.get(k)!;
    if (row["Rating"]) d.rating = parseFloat(row["Rating"]);
    if (row["Watched Date"] && (!d.watchedDate || row["Watched Date"] > d.watchedDate)) d.watchedDate = row["Watched Date"];
    if (row["Rewatch"] === "Yes") d.isRewatch = true;
  }

  return unified;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║  Letterboxd × TMDB Sync                        ║");
  console.log("╚════════════════════════════════════════════════╝\n");

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // 1. Load existing cache
  const cacheBySlug  = new Map<string, StaticMovie>();
  const cacheByTitle = new Map<string, StaticMovie>();  // Title||Year → movie
  let existing: StaticMovie[] = [];

  if (fs.existsSync(CACHE_FILE)) {
    existing = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    for (const m of existing) {
      cacheBySlug.set(m.slug, m);
      cacheByTitle.set(`${m.title.toLowerCase().trim()}||${m.year ?? ""}`, m);
    }
    console.log(`  ✓ Loaded ${existing.length} cached films.`);
  }

  // 2. Load CSV export for historical ratings/dates
  const csvData = loadCsvData();
  console.log(`  ✓ Loaded ${csvData.size} films from CSV export.`);

  // 3. Fetch live RSS to detect NEW films (logged after the export)
  const rssItems = await fetchRssSlugs();
  console.log(`  ✓ Fetched ${rssItems.length} entries from RSS.\n`);

  // ── Phase A: Backfill TMDB data for cached films missing posters ──────────
  const needsPoster = existing.filter(m => !m.poster);
  console.log(`  Phase A — Backfilling posters for ${needsPoster.length} cached films via TMDB...`);

  const BATCH = 20;
  let done = 0;
  let updated = 0;

  for (let i = 0; i < needsPoster.length; i += BATCH) {
    const batch = needsPoster.slice(i, i + BATCH);
    await Promise.all(batch.map(async m => {
      const id = m.tmdbId ?? await tmdbSearch(m.title, m.year);
      if (!id) return;
      const details = await tmdbDetails(id);
      if (!details) return;

      const enriched = buildMovieFromTmdb(m, details);
      // Merge: keep existing metadata, only update missing fields + always set poster/tmdbId
      const cached = cacheBySlug.get(m.slug)!;
      cached.poster  = enriched.poster;
      cached.tmdbId  = enriched.tmdbId;
      if (!cached.genres?.length)    cached.genres    = enriched.genres;
      if (!cached.directors?.length) cached.directors = enriched.directors;
      if (!cached.actors?.length)    cached.actors    = enriched.actors;
      if (!cached.runtime)           cached.runtime   = enriched.runtime;
      if (!cached.languages?.length) cached.languages = enriched.languages;
      if (!cached.countries?.length) cached.countries = enriched.countries;
      if (!cached.decade)            cached.decade    = enriched.decade;
      updated++;
    }));
    done += batch.length;
    process.stdout.write(`\r    ${done}/${needsPoster.length} processed...`);
    await sleep(60); // TMDB: 40 req/s, be safe
  }

  console.log(`\n  ✓ Updated ${updated} films with TMDB posters & metadata.\n`);

  // ── Phase B: Add new films from RSS not in cache ──────────────────────────
  const newFromRss = rssItems.filter(r => !cacheBySlug.has(r.slug));
  console.log(`  Phase B — Adding ${newFromRss.length} new films from RSS...`);

  for (const rssFilm of newFromRss) {
    const id = await tmdbSearch(rssFilm.title, rssFilm.year ? parseInt(rssFilm.year) : null);
    let movie: StaticMovie;

    if (id) {
      const details = await tmdbDetails(id);
      if (details) {
        movie = buildMovieFromTmdb({
          slug:        rssFilm.slug,
          title:       rssFilm.title,
          year:        rssFilm.year ? parseInt(rssFilm.year) : null,
          rating:      rssFilm.rating,
          watchedDate: rssFilm.watchedDate,
          isRewatch:   rssFilm.isRewatch,
        }, details);
        // Override poster with RSS poster if TMDB one missing
        if (!movie.poster && rssFilm.poster) movie.poster = rssFilm.poster;
      } else {
        movie = makeBasicMovie(rssFilm);
      }
    } else {
      movie = makeBasicMovie(rssFilm);
    }

    existing.push(movie);
    cacheBySlug.set(movie.slug, movie);
    process.stdout.write(`  + ${movie.title} (${movie.year})\n`);
    await sleep(60);
  }

  // ── Phase C: Merge CSV ratings/dates into cache (overrides old scraped ratings) ─
  for (const [key, csvFilm] of csvData.entries()) {
    const cached = cacheByTitle.get(key);
    if (cached) {
      // CSV data is the authoritative source for ratings and watch dates
      if (csvFilm.rating !== null) cached.rating = csvFilm.rating;
      if (csvFilm.watchedDate)     cached.watchedDate = csvFilm.watchedDate;
      if (csvFilm.isRewatch)       cached.isRewatch   = true;
    }
  }

  // ── Also update cache entries from RSS (latest ratings/dates) ─────────────
  for (const rssFilm of rssItems) {
    const cached = cacheBySlug.get(rssFilm.slug);
    if (cached) {
      if (rssFilm.rating !== null) cached.rating      = rssFilm.rating;
      if (rssFilm.watchedDate)     cached.watchedDate = rssFilm.watchedDate;
      if (rssFilm.isRewatch)       cached.isRewatch   = true;
      // Fill in poster from RSS if TMDB didn't find one
      if (!cached.poster && rssFilm.poster) cached.poster = rssFilm.poster;
    }
  }

  // ── Deduplicate by slug ───────────────────────────────────────────────────
  const finalMap = new Map<string, StaticMovie>();
  for (const m of existing) {
    if (m.slug) finalMap.set(m.slug, m);
  }
  const finalArray = Array.from(finalMap.values());

  // ── Save ──────────────────────────────────────────────────────────────────
  fs.writeFileSync(CACHE_FILE, JSON.stringify(finalArray, null, 2), "utf-8");

  const withPosters    = finalArray.filter(m => m.poster).length;
  const withoutPosters = finalArray.filter(m => !m.poster).length;

  console.log(`\n╔════════════════════════════════════════════════╗`);
  console.log(`║  SYNC COMPLETE                                 ║`);
  console.log(`║  Total films:    ${String(finalArray.length).padEnd(30)}║`);
  console.log(`║  With poster:    ${String(withPosters).padEnd(30)}║`);
  console.log(`║  Missing poster: ${String(withoutPosters).padEnd(30)}║`);
  console.log(`╚════════════════════════════════════════════════╝`);
}

function makeBasicMovie(rssFilm: any): StaticMovie {
  const year = rssFilm.year ? parseInt(rssFilm.year) : null;
  return {
    slug:        rssFilm.slug,
    title:       rssFilm.title,
    year,
    runtime:     0,
    decade:      year ? `${Math.floor(year / 10) * 10}s` : null,
    languages:   [],
    countries:   [],
    genres:      [],
    directors:   [],
    actors:      [],
    rating:      rssFilm.rating ?? null,
    watchedDate: rssFilm.watchedDate ?? null,
    isRewatch:   rssFilm.isRewatch ?? false,
    poster:      rssFilm.poster ?? "",
    tmdbId:      null,
  };
}

main().catch(console.error);
