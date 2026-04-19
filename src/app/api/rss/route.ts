import { NextResponse } from "next/server";
import { parseRss } from "@/lib/parseRss";

const USERNAME = process.env.LETTERBOXD_USER || "lboxd";

export async function GET() {
  try {
    const url = `https://letterboxd.com/${USERNAME}/rss/`;
    const res = await fetch(url, { next: { revalidate: 60 } });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch Letterboxd RSS feed." }, { status: 502 });
    }

    const xml = await res.text();
    const movies = parseRss(xml);

    return NextResponse.json({ username: USERNAME, movies });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Error processing RSS feed." }, { status: 500 });
  }
}
