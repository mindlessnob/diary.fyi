import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const FAVORITES_PATH = path.join(process.cwd(), "src", "data", "favorites.json");

function readFavorites() {
  if (!fs.existsSync(FAVORITES_PATH)) return [];
  return JSON.parse(fs.readFileSync(FAVORITES_PATH, "utf-8"));
}

// GET: return favorites + TMDB-fetched posters for any without an override
export async function GET() {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Admin disabled in production" }, { status: 403 });
  }

  const favs = readFavorites();
  const apiKey = process.env.TMDB_API_KEY;

  const withPosters = await Promise.all(
    favs.map(async (fav: any) => {
      if (fav.posterOverride) return { ...fav, tmdbPoster: null };
      if (!apiKey) return { ...fav, tmdbPoster: null };
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(fav.title)}&year=${fav.year}&page=1`
        );
        const d = await res.json();
        const pp = d.results?.[0]?.poster_path;
        return { ...fav, tmdbPoster: pp ? `https://image.tmdb.org/t/p/w342${pp}` : null };
      } catch {
        return { ...fav, tmdbPoster: null };
      }
    })
  );

  return NextResponse.json({ favorites: withPosters });
}

// POST: save posterOverride for a given index
export async function POST(req: Request) {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Admin disabled in production" }, { status: 403 });
  }

  const { index, posterOverride } = await req.json();
  if (index === undefined) return NextResponse.json({ error: "index required" }, { status: 400 });

  const favs = readFavorites();
  if (index < 0 || index >= favs.length) {
    return NextResponse.json({ error: "invalid index" }, { status: 400 });
  }

  favs[index].posterOverride = posterOverride ?? "";
  fs.writeFileSync(FAVORITES_PATH, JSON.stringify(favs, null, 2));
  return NextResponse.json({ success: true, favorites: favs });
}
