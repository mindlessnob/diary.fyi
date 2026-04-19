import { NextResponse } from "next/server";

export async function GET(req: Request) {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Admin disabled in production" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();
  const apiKey = process.env.TMDB_API_KEY;

  if (!query) return NextResponse.json({ results: [] });
  if (!apiKey) return NextResponse.json({ error: "TMDB_API_KEY not set in .env.local" }, { status: 500 });

  const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
  const res = await fetch(url);
  const data = await res.json();

  const results = (data.results || []).slice(0, 10).map((r: any) => ({
    id:     r.id,
    title:  r.title,
    year:   r.release_date ? r.release_date.slice(0, 4) : null,
    poster: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : null,
  }));

  return NextResponse.json({ results });
}
