import * as fs from "fs";
import * as path from "path";
import YearInReview from "@/components/YearInReview";

export const revalidate = 3600;

const USERNAME = process.env.LETTERBOXD_USER || "lboxd";

export const metadata = {
  title: `${USERNAME} · Year in Film`,
  description: `A yearly breakdown of ${USERNAME}'s film diary — films watched, top directors, genres, and more.`,
};

export default async function YearPage() {
  const cachePath = path.join(process.cwd(), "src", "data", "lifetime.json");
  let movies: any[] = [];

  try {
    if (fs.existsSync(cachePath)) {
      movies = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    }
  } catch {
    // fail silently
  }

  const years = [...new Set(
    movies
      .map((m: any) => m.watchedDate?.slice(0, 4))
      .filter(Boolean)
  )].sort().map(Number) as number[];

  return <YearInReview movies={movies} years={years} username={USERNAME} />;
}
