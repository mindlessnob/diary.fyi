import { NextResponse } from "next/server";

/**
 * Simple image proxy to bypass CORS restrictions on external images
 * (Letterboxd avatar CDN, etc.) so html2canvas can draw them onto canvas.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 });

    const buf = await res.arrayBuffer();
    const ct  = res.headers.get("content-type") ?? "image/jpeg";

    return new Response(buf, {
      headers: {
        "Content-Type": ct,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Proxy error" }, { status: 500 });
  }
}
