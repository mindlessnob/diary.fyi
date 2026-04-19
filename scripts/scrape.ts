import * as fs from "fs";
import * as path from "path";
import * as cheerio from "cheerio";

const USERNAME = process.env.LETTERBOXD_USER || "lboxd";

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

export interface UserProfile {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  filmsWatched: number;
  filmsThisYear: number;
  lists: number;
  following: number;
  followers: number;
  scrapedAt: string;
}

const BASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function parseRatedClass(cls: string | undefined): number | null {
  if (!cls) return null;
  const m = cls.match(/\brated-(\d+)\b/);
  if (!m) return null;
  return parseInt(m[1], 10) / 2;
}

async function fetchHtml(url: string, retries = 3): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: BASE_HEADERS });
      if (res.status === 429 || res.status === 403) { await sleep(4000 * (i + 1)); continue; }
      if (!res.ok) return null;
      return await res.text();
    } catch {
      await sleep(1500 * (i + 1));
    }
  }
  return null;
}

const cleanText = (s: string | undefined): string | null => s?.trim() || null;

// ── STEP 1: Profile ───────────────────────────────────────────────────────────

async function scrapeProfile(): Promise<UserProfile> {
  console.log(`\n[1/3] Scraping profile @${USERNAME}...`);
  const profile: UserProfile = {
    username: USERNAME, displayName: USERNAME, bio: "", avatarUrl: "",
    filmsWatched: 0, filmsThisYear: 0, lists: 0, following: 0, followers: 0,
    scrapedAt: new Date().toISOString(),
  };

  const html = await fetchHtml(`https://letterboxd.com/${USERNAME}/`);
  if (!html) { console.log("  Profile fetch failed."); return profile; }

  const $ = cheerio.load(html);

  profile.displayName = cleanText($("h1.title-1").first().text()) || USERNAME;

  const meta = $('meta[name="description"]').attr("content") || "";
  const bioMatch = meta.match(/Bio:\s*(.+?)(?:\s*$)/);
  profile.bio = bioMatch?.[1]?.trim() || cleanText($(".bio p").first().text()) || "";

  $("img").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (src.includes("avtr") && src.includes("1000") && !profile.avatarUrl) {
      profile.avatarUrl = src;
    }
  });

  $(".profile-statistic.statistic").each((_, el) => {
    const raw = $(el).text().replace(/\s+/g, " ").trim();
    const numMatch = raw.match(/^([\d,]+)/);
    if (!numMatch) return;
    const val = parseInt(numMatch[1].replace(/,/g, ""), 10);
    const label = raw.slice(numMatch[1].length).toLowerCase();
    if (label.includes("film") && !label.includes("year")) profile.filmsWatched = val;
    else if (label.includes("year")) profile.filmsThisYear = val;
    else if (label.includes("list")) profile.lists = val;
    else if (label.includes("following")) profile.following = val;
    else if (label.includes("follower")) profile.followers = val;
  });

  if (!profile.filmsWatched) {
    const m = meta.match(/([\d,]+)\s*films?\s*watched/i);
    if (m) profile.filmsWatched = parseInt(m[1].replace(/,/g, ""), 10);
  }

  console.log(`  ✓ ${profile.filmsWatched} films · ${profile.filmsThisYear} this year · ${profile.followers} followers`);
  return profile;
}

// ── STEP 2: Aggregate Slugs and Ratings ───────────────────────────────────────

type FilmRecord = { rating: number | null; watchedDate: string | null; isRewatch: boolean };

async function scrapeFilmRecords(): Promise<Map<string, FilmRecord>> {
  const records = new Map<string, FilmRecord>();

  // A) Diary passes for dates + ratings (often captures ~70% of films)
  console.log(`\n[2/3] Scraping Diary & Rated pages for complete dataset...`);
  console.log(`      Pass A: Diary Pages (dates + ratings)`);
  
  let page = 1;
  let hasNext = true;
  let dFound = 0;
  while (hasNext) {
    const html = await fetchHtml(`https://letterboxd.com/${USERNAME}/diary/page/${page}/`);
    if (!html) break;
    const $ = cheerio.load(html);
    let count = 0;

    $("tr.diary-entry-row").each((_, row) => {
      let slug: string | undefined;
      $(row).find("a").each((_, a) => {
        const href = $(a).attr("href") || "";
        const m = href.match(new RegExp(`^/${USERNAME}/film/([^/]+)/$`));
        if (m) { slug = m[1]; return false; }
      });
      if (!slug) return;

      const ratedClass = $(row).find("span.rating").attr("class");
      const rating = parseRatedClass(ratedClass);

      let watchedDate: string | null = null;
      $(row).find("a").each((_, a) => {
        const href = $(a).attr("href") || "";
        const dm = href.match(/\/for\/(\d{4})\/(\d{2})\/(\d{2})\/?$/);
        if (dm) { watchedDate = `${dm[1]}-${dm[2]}-${dm[3]}`; return false; }
      });

      const isRewatch = $(row).find(".icon-rewatch, [class*='rewatch']").length > 0;

      if (!records.has(slug)) {
        records.set(slug, { rating, watchedDate, isRewatch });
        count++;
      }
    });

    dFound += count;
    process.stdout.write(`\r      Diary page ${page}: ${dFound} films found`);
    hasNext = $("a.next").length > 0;
    page++;
    await sleep(200);
  }
  console.log();

  // B) General films list to fill in the rest (~4,000 films total target)
  // This page has `poster-viewingdata` which contains `rating -micro -darker rated-N`
  console.log(`      Pass B: All Films List (filling in missing films/ratings)`);
  page = 1;
  hasNext = true;
  let fFound = 0;
  
  while (hasNext) {
    const html = await fetchHtml(`https://letterboxd.com/${USERNAME}/films/page/${page}/`);
    if (!html) break;
    const $ = cheerio.load(html);
    let count = 0;

    // Use multiple fallback selectors for Letterboxd HTML variants
    $("li.poster-container, div.film-poster, .film-poster, li[data-film-slug]").each((_, el) => {
      // 1. Slug Extraction
      let slug = $(el).attr("data-film-slug") || $(el).find("div[data-film-slug]").attr("data-film-slug");
      if (!slug) {
        $(el).find('a[href^="/film/"]').each((_, a) => {
           const href = $(a).attr('href') || "";
           const m = href.match(/^\/film\/([^/]+)\/?$/);
           if (m) { slug = m[1]; return false; }
        });
      }
      
      if (!slug) return;
      slug = cleanText(slug);
      if (!slug) return;

      // 2. Rating Extraction using the user's provided selector: `.poster-viewingdata .rating`
      const viewingData = $(el).find('.poster-viewingdata [class*="rated-"], span[class*="rated-"], p.poster-viewingdata span.rating');
      const ratedClass = viewingData.attr("class");
      const listRating = parseRatedClass(ratedClass);

      if (records.has(slug)) {
        const existing = records.get(slug)!;
        // If diary missed the rating but films page has it, upgrade!
        if (existing.rating === null && listRating !== null) {
          existing.rating = listRating;
          records.set(slug, existing);
        }
      } else {
        records.set(slug, { rating: listRating, watchedDate: null, isRewatch: false });
        count++;
      }
    });

    // Sometimes slugs are completely hidden from classes, fallback to matching all hrefs inside standard lists
    if (count === 0) {
      $('[class*="poster"] a[href^="/film/"]').each((_, el) => {
         const href = $(el).attr('href') || "";
         const m = href.match(/^\/film\/([^/]+)\/?$/);
         if (m && m[1]) {
           const slug = m[1];
           if (!records.has(slug)) {
              records.set(slug, { rating: null, watchedDate: null, isRewatch: false });
              count++;
           }
         }
      });
    }

    fFound += count;
    process.stdout.write(`\r      Films page ${page}: ${records.size} total unique films captured`);
    hasNext = $("a.next").length > 0;
    page++;
    await sleep(200);
  }
  
  const ratedCount = [...records.values()].filter(f => f.rating !== null).length;
  console.log(`\n  ✓ Aggregated ${records.size} unique films (${ratedCount} have ratings)`);
  return records;
}

// ── STEP 3: Fetch Deep Meta ───────────────────────────────────────────────────

async function fetchFilmMeta(slug: string, record: FilmRecord): Promise<StaticMovie | null> {
  const html = await fetchHtml(`https://letterboxd.com/film/${slug}/`);
  if (!html) return null;

  const $ = cheerio.load(html);

  const movie: StaticMovie = {
    slug,
    title: cleanText($("h1.headline-1, h1.film-title").first().text()) || slug,
    year: null,
    runtime: 0,
    decade: null,
    languages: [],
    countries: [],
    genres: [],
    directors: [],
    actors: [],
    rating:      record.rating,
    watchedDate: record.watchedDate,
    isRewatch:   record.isRewatch,
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
  if (yearMatch) {
    movie.year = parseInt(yearMatch[1], 10);
    movie.decade = `${Math.floor(movie.year / 10) * 10}s`;
  }

  const rtMatch = $(".text-link.text-footer, p.text-link").text().match(/(\d+)\s*min/i);
  if (rtMatch) movie.runtime = parseInt(rtMatch[1], 10);

  movie.languages = [...new Set(movie.languages)];
  movie.countries = [...new Set(movie.countries)];
  movie.genres    = [...new Set(movie.genres)];
  movie.directors = [...new Set(movie.directors)];
  movie.actors    = [...new Set(movie.actors)];

  return movie;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function start() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║  Letterboxd Scraper  — FULL PASS          ║");
  console.log(`║  User: @${USERNAME.padEnd(32)}║`);
  console.log("╚═══════════════════════════════════════════╝");

  const outDir = path.join(process.cwd(), "src", "data");
  fs.mkdirSync(outDir, { recursive: true });

  const profile = await scrapeProfile();
  fs.writeFileSync(path.join(outDir, "profile.json"), JSON.stringify(profile, null, 2), "utf-8");

  const records = await scrapeFilmRecords();
  const slugs = [...records.keys()];

  console.log(`\n[3/3] Fetching deep metadata for ${slugs.length} films...`);
  const results: StaticMovie[] = [];
  const BATCH = 30; // Batched processing
  let done = 0;
  let rated = 0;

  for (let i = 0; i < slugs.length; i += BATCH) {
    const batch = slugs.slice(i, i + BATCH);
    const settled = await Promise.allSettled(batch.map(s => fetchFilmMeta(s, records.get(s)!)));
    settled.forEach(r => {
      if (r.status === "fulfilled" && r.value) {
        results.push(r.value);
        if (r.value.rating !== null) rated++;
      }
    });
    done += batch.length;
    process.stdout.write(
      `\r  ${Math.min(done, slugs.length)}/${slugs.length} processed · ${rated} rated (${Math.round((rated / Math.max(results.length, 1)) * 100)}%)`
    );
    await sleep(200); // polite delay
  }

  console.log(`\n\n╔═══════════════════════════════════════════╗`);
  console.log(`║  DONE                                     ║`);
  console.log(`║  Films:     ${String(results.length).padEnd(29)}║`);
  console.log(`║  Rated:     ${String(rated).padEnd(29)}║`);
  console.log(`║  Rated %:   ${String(Math.round((rated / results.length) * 100) + "%").padEnd(29)}║`);
  console.log(`╚═══════════════════════════════════════════╝`);

  fs.writeFileSync(path.join(outDir, "lifetime.json"), JSON.stringify(results, null, 2), "utf-8");
  console.log("\n  → lifetime.json successfully regenerated. Dashboard is up to date!");
}

start().catch(console.error);
