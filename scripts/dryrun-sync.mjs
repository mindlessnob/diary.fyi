// Dry-run: shows what RSS items are NOT yet in lifetime.json
// Run with: node scripts/dryrun-sync.mjs
import fs from "fs";

const USERNAME = process.env.LETTERBOXD_USER || "lboxd";
const CACHE     = JSON.parse(fs.readFileSync("src/data/lifetime.json", "utf-8"));
const slugSet   = new Set(CACHE.map(m => m.slug));

console.log(`Cache: ${CACHE.length} films`);
const latest = CACHE.filter(m=>m.watchedDate).sort((a,b)=>b.watchedDate.localeCompare(a.watchedDate))[0];
console.log(`Latest in cache: "${latest?.title}" on ${latest?.watchedDate}\n`);

const res = await fetch(`https://letterboxd.com/${USERNAME}/rss/`, {
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
});
const xml = await res.text();
const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

const parsed = items.map(block => {
  const linkUrl = block.match(/<link>([^<]+)<\/link>/)?.[1]?.trim();
  const slug  = linkUrl ? linkUrl.match(/\/film\/([^\/]+)\//)?.[1] : null;
  const title = block.match(/<letterboxd:filmTitle>([^<]+)<\/letterboxd:filmTitle>/)?.[1]?.trim();
  const date  = block.match(/<letterboxd:watchedDate>([^<]+)<\/letterboxd:watchedDate>/)?.[1]?.trim();
  const rating = block.match(/<letterboxd:memberRating>([^<]+)<\/letterboxd:memberRating>/)?.[1]?.trim();
  return { slug, title, date, rating: rating ?? "—" };
}).filter(i => i.slug);

console.log(`RSS items: ${parsed.length}`);

const newItems = parsed.filter(i => !slugSet.has(i.slug));
console.log(`NEW (not in cache): ${newItems.length}\n`);

if (newItems.length === 0) {
  console.log("✅  Cache is already up to date — nothing to sync.");
} else {
  newItems.forEach(f => console.log(`  + [${f.date}] ${f.title} (★${f.rating})`));
  console.log(`\nRun "npm run sync" to add these ${newItems.length} films with full TMDB metadata.`);
}
