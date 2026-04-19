import * as fs from "fs";
import * as path from "path";
import * as cheerio from "cheerio";
import { parse } from "csv-parse/sync";

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const exportDirs = fs.readdirSync(process.cwd()).filter(f => fs.statSync(f).isDirectory() && f.startsWith("letterboxd-") && f.endsWith("-utc"));
const EXPORT_DIR = exportDirs.length > 0 ? path.join(process.cwd(), exportDirs[0]) : "";
const DATA_DIR = path.join(process.cwd(), "src", "data");
const CACHE_FILE = path.join(DATA_DIR, "lifetime.json");

export interface StaticMovie {
  slug: string;
  title: string;
  year: number | null;
  runtime: number;
  decade: string | null;
  languages: string[];
  countries: string[];
  genres: string[];
  directors: string[];
  actors: string[];
  rating: number | null;
  watchedDate: string | null;
  isRewatch: boolean;
}

const BASE_HEADERS = { "User-Agent": "Mozilla/5.0" };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const cleanText = (s: string | undefined): string | null => s?.trim() || null;

async function fetchFilmPage(url: string, retries = 3): Promise<{ html: string | null; url: string }> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: BASE_HEADERS, redirect: "follow" });
      if (res.status === 429 || res.status === 403) { await sleep(4000 * (i + 1)); continue; }
      if (!res.ok) return { html: null, url: res.url };
      const html = await res.text();
      return { html, url: res.url };
    } catch {
      await sleep(1500 * (i + 1));
    }
  }
  return { html: null, url };
}

function parseDeepMeta(html: string, resolvedUrl: string, baseData: Partial<StaticMovie>): StaticMovie {
  const $ = cheerio.load(html);
  
  let slug = baseData.slug || "";
  const match = resolvedUrl.match(/\/film\/([^/]+)\/?/);
  if (match) slug = match[1];

  const movie: StaticMovie = {
    slug,
    title: baseData.title || cleanText($("h1.headline-1, h1.film-title").first().text()) || slug,
    year: baseData.year || null,
    runtime: 0,
    decade: null,
    languages: [],
    countries: [],
    genres: [],
    directors: [],
    actors: [],
    rating: baseData.rating || null,
    watchedDate: baseData.watchedDate || null,
    isRewatch: baseData.isRewatch || false,
  };

  const details = $("#tab-details");
  details.find('a[href^="/films/language/"]').each((_, el) => {
    const l = cleanText($(el).text());
    if (l) movie.languages.push(l === "No spoken language" ? "None" : l);
  });
  details.find('a[href^="/films/country/"]').each((_, el) => {
    const c = cleanText($(el).text());
    if (c) movie.countries.push(c);
  });
  $('a[href^="/films/genre/"]').each((_, el) => {
    const g = cleanText($(el).text());
    if (g) movie.genres.push(g.charAt(0).toUpperCase() + g.slice(1));
  });
  $('a[href^="/director/"]').each((_, el) => {
    const d = cleanText($(el).text());
    if (d) movie.directors.push(d);
  });
  $('a[href^="/actor/"]').each((_, el) => {
    const a = cleanText($(el).text());
    if (a && !/^\s*(show|hide)/i.test(a)) movie.actors.push(a);
  });

  const yearMatch = $("span.releasedate a, .film-year").text().match(/(\d{4})/);
  if (yearMatch) movie.year = parseInt(yearMatch[1], 10);
  if (movie.year) movie.decade = `${Math.floor(movie.year / 10) * 10}s`;

  const rtMatch = $(".text-link.text-footer, p.text-link").text().match(/(\d+)\s*min/i);
  if (rtMatch) movie.runtime = parseInt(rtMatch[1], 10);

  movie.languages = [...new Set(movie.languages)];
  movie.countries = [...new Set(movie.countries)];
  movie.genres    = [...new Set(movie.genres)];
  movie.directors = [...new Set(movie.directors)];
  movie.actors    = [...new Set(movie.actors)];

  return movie;
}

// ── MAIN IMPORT SCRIPT ────────────────────────────────────────────────────────

async function start() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║  Letterboxd CSV Importer (Fixed Keys)     ║");
  console.log("╚═══════════════════════════════════════════╝");

  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`Export directory not found: ${EXPORT_DIR}`);
    return;
  }

  // 1. Read files
  const watchedRaw = fs.readFileSync(path.join(EXPORT_DIR, "watched.csv"), "utf-8");
  const ratingsRaw = fs.readFileSync(path.join(EXPORT_DIR, "ratings.csv"), "utf-8");
  const diaryRaw   = fs.readFileSync(path.join(EXPORT_DIR, "diary.csv"), "utf-8");

  const watched = parse(watchedRaw, { columns: true, skip_empty_lines: true });
  const ratings = parse(ratingsRaw, { columns: true, skip_empty_lines: true });
  const diary   = parse(diaryRaw,   { columns: true, skip_empty_lines: true });

  const unified = new Map<string, any>(); // key = Title||Year

  const genKey = (title: string, year: string | number) => `${title.toLowerCase().trim()}||${year || ""}`;

  // Initialize with watched
  for (const row of watched) {
    const key = genKey(row["Name"], row["Year"]);
    unified.set(key, {
      uri: row["Letterboxd URI"], // Boxd.it film link
      title: row["Name"],
      year: parseInt(row["Year"]) || null,
      rating: null,
      watchedDate: null, 
      isRewatch: false
    });
  }

  // Merge ratings
  for (const row of ratings) {
    const key = genKey(row["Name"], row["Year"]);
    if (!unified.has(key)) {
       // if not in watched for some reason, add it
      unified.set(key, { uri: row["Letterboxd URI"], title: row["Name"], year: parseInt(row["Year"]) || null, rating: null, watchedDate: null, isRewatch: false });
    }
    const d = unified.get(key);
    d.rating = parseFloat(row["Rating"]);
    d.uri = row["Letterboxd URI"]; // ensure canonical film URI
  }

  // Merge diary
  for (const row of diary) {
    const key = genKey(row["Name"], row["Year"]);
    if (!unified.has(key)) {
      unified.set(key, { uri: row["Letterboxd URI"], title: row["Name"], year: parseInt(row["Year"]) || null, rating: null, watchedDate: null, isRewatch: false });
    }
    const d = unified.get(key);
    if (row["Rating"]) d.rating = parseFloat(row["Rating"]);
    
    // In diary, multiple views might exist! Update to most recent or keep track. We just want ONE representative date for now.
    // Letterboxd diary is ordered chronologically, we take the FIRST one we encounter (assuming it's chronological vs reverse)
    if (row["Watched Date"] && (!d.watchedDate || row["Watched Date"] > d.watchedDate)) {
      d.watchedDate = row["Watched Date"];
    }
    if (row["Rewatch"] === "Yes") d.isRewatch = true;
  }

  console.log(`  ✓ Combined ${unified.size} unique films from CSV.`);

  // Load Cache
  const cacheMap = new Map<string, StaticMovie>();
  let cachedRecords = 0;
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const cache: StaticMovie[] = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
      for (const m of cache) {
        // Only valid cached items (to protect from previous run's duplicated diary entries)
        // Diary entries from previous run might have weird slugs or whatever.
        const key = genKey(m.title, m.year || "");
        cacheMap.set(key, m);
        cachedRecords++;
      }
      console.log(`  ✓ Loaded ${cacheMap.size} valid cached films.`);
    } catch {}
  }

  const results: StaticMovie[] = [];
  const needsFetch: any[] = [];

  for (const [key, data] of unified.entries()) {
    if (cacheMap.has(key)) {
      const cached = cacheMap.get(key)!;
      // We still map in the trusted rating/dates from CSV!
      cached.rating = data.rating;
      cached.watchedDate = data.watchedDate;
      cached.isRewatch = data.isRewatch;
      // if previous run ruined slug, but wait, previous run made 7000+ cache entries...
      // Diary entries resulted in slugs like "honeypals/film/bodied/1"
      if (!cached.slug || cached.slug.includes("/")) {
         // this is an invalid cached entry from our last buggy run. Re-fetch!
         needsFetch.push(data);
      } else {
         results.push(cached);
      }
    } else {
      needsFetch.push(data);
    }
  }

  console.log(`\n  → Processing ${needsFetch.length} new films via deep fetch...`);

  const BATCH = 30;
  let done = 0;

  for (let i = 0; i < needsFetch.length; i += BATCH) {
    const batch = needsFetch.slice(i, i + BATCH);
    const promises = batch.map(async (data) => {
      // If the URI is a diary entry (GA3kX format or /honeypals/), it will redirect to /honeypals/film/...
      // But we just use the HTML. Actually, we should fetch the film page! 
      // Good thing boxd.it/ GA3kX goes to the diary page, which HAS the film link `a[data-film-slug]`!
      const { html, url } = await fetchFilmPage(data.uri);

      if (!html) {
         return {
           slug: "",
           title: data.title, year: data.year, runtime: 0, decade: data.year ? `${Math.floor(data.year / 10) * 10}s` : null,
           languages: [], countries: [], genres: [], directors: [], actors: [],
           rating: data.rating, watchedDate: data.watchedDate, isRewatch: data.isRewatch
         };
      }
      
      const parsed = parseDeepMeta(html, url, data);
      
      // if it resolved to a diary page, it might not have details! 
      const USERNAME = process.env.LETTERBOXD_USER || "lboxd";
      if (url.includes(`/${USERNAME}/film/`)) {
         // Diary entry page! The "data-film-link" gives us the actual film slug!
         const $ = cheerio.load(html);
         const realSlug = $(".frame").attr("data-film-link")?.replace("/film/", "").replace("/", "");
         if (realSlug) {
             const filmPage = await fetchFilmPage(`https://letterboxd.com/film/${realSlug}/`);
             if (filmPage.html) {
                 return parseDeepMeta(filmPage.html, filmPage.url, data);
             }
         }
      }
      return parsed;
    });

    const settled = await Promise.allSettled(promises);
    for (const r of settled) {
      if (r.status === "fulfilled") results.push(r.value);
    }
    
    done += batch.length;
    process.stdout.write(`\r    ${Math.min(done, needsFetch.length)}/${needsFetch.length} fetched...`);
    await sleep(200);
  }

  // Filter out any duplicates based on title+year or slug just in case
  const finalUnique = new Map<string, StaticMovie>();
  for (const m of results) {
     const k = genKey(m.title, m.year || "");
     finalUnique.set(k, m);
  }

  const finalArray = Array.from(finalUnique.values());

  fs.writeFileSync(CACHE_FILE, JSON.stringify(finalArray, null, 2), "utf-8");
  
  console.log(`\n\n╔═══════════════════════════════════════════╗`);
  console.log(`║  IMPORT DONE (Fixed)                      ║`);
  console.log(`║  Total Films in Dashboard: ${String(finalArray.length).padEnd(14)} ║`);
  console.log(`╚═══════════════════════════════════════════╝`);
  console.log(`  → Data saved to ${CACHE_FILE}`);
}

start().catch(console.error);
