import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

// Basic in-memory cache to prevent re-fetching the same slug during server lifecycle
const posterCache = new Map<string, string>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return new NextResponse("Missing slug", { status: 400 });
  }

  if (posterCache.has(slug)) {
    return NextResponse.redirect(posterCache.get(slug)!, { status: 302 });
  }

  try {
    const res = await fetch(`https://letterboxd.com/film/${slug}/`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 86400 } // cache at Next.js level for 24h
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch from LB", { status: parseInt(res.status.toString(), 10) });
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Look for the standard poster image in standard presentation
    let posterUrl = $('script[type="application/ld+json"]').html();
    let imgMatch;
    
    if (posterUrl) {
      try {
        const ld = JSON.parse(posterUrl);
        if (ld.image) imgMatch = ld.image;
      } catch (e) {}
    }

    if (!imgMatch) {
       imgMatch = $('meta[property="og:image"]').attr("content");
    }

    // Since og:image is wide (1200x675), we want the vertical poster if possible
    // Letterboxd also puts the poster URL in the film-poster div body
    // <img src="https://a.ltrbxd.com/resized/film-poster/1/2/...crop.jpg">
    const actualPoster = $("div.film-poster img.image").attr("src");
    
    const finalUrl = actualPoster || imgMatch || "";

    if (finalUrl) {
      posterCache.set(slug, finalUrl);
      return NextResponse.redirect(finalUrl, { status: 302 });
    } else {
      return new NextResponse("No poster found", { status: 404 });
    }
  } catch (err) {
    return new NextResponse("Error resolving poster", { status: 500 });
  }
}
