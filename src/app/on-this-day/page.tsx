import OnThisDayClient from "@/components/OnThisDayClient";
import { applyOverrides } from "@/lib/applyOverrides";

// Force static rendering since it only needs to update once a day
export const revalidate = 3600;

export default async function OnThisDayPage() {
  // Using require() with a static string guarantees Vercel bundles it
  let raw: any[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    raw = require("@/data/lifetime.json");
  } catch (e) {
    console.error("Failed to load lifetime.json", e);
  }

  // Apply overrides for posters/titles
  const movies = applyOverrides(raw);

  // Get current date locked to GMT+7 (Asia/Jakarta)
  const todayRaw = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  const today = new Date(todayRaw);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dateStr = `${monthNames[today.getMonth()]} ${today.getDate()}`;
  
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const currentYear = today.getFullYear();
  const searchString = `-${month}-${day}`;

  // Find historical matches
  const matches = movies
    .filter((m: any) => {
      if (!m.watchedDate) return false;
      if (m.watchedDate.endsWith(searchString)) {
        const year = parseInt(m.watchedDate.split("-")[0], 10);
        return year < currentYear;
      }
      return false;
    })
    .map((m: any) => {
      const year = parseInt(m.watchedDate.split("-")[0], 10);
      return { 
        slug: m.slug,
        title: m.title,
        year: m.year,
        director: m.directors?.[0] || "",
        poster: m.poster ?? "",
        watchedDate: m.watchedDate,
        rating: m.rating ?? null,
        isRewatch: m.isRewatch ?? false,
        yearsAgo: currentYear - year 
      };
    })
    .sort((a: any, b: any) => a.yearsAgo - b.yearsAgo);

  // Randomly pick exactly ONE memory from history (if any exist)
  const selectedMatch = matches.length > 0 
    ? [matches[Math.floor(Math.random() * matches.length)]] 
    : [];

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
      <OnThisDayClient matches={selectedMatch} dateStr={dateStr} />
    </main>
  );
}
