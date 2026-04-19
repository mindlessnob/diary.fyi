import { NextResponse } from "next/server";
import { loadOverrides, saveOverrides } from "@/lib/applyOverrides";

export async function POST(req: Request) {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Admin disabled in production" }, { status: 403 });
  }

  const body = await req.json();
  const { slug, poster, tmdbId, title, clear } = body;

  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const overrides = loadOverrides();

  if (clear) {
    delete overrides[slug];
  } else {
    const existing = overrides[slug] || {};
    const updated: Record<string, any> = { ...existing };
    if (poster  !== undefined && poster  !== "") updated.poster  = poster;
    if (poster  === "")                          delete updated.poster;
    if (tmdbId  !== undefined)                   updated.tmdbId  = tmdbId;
    if (title   !== undefined && title   !== "") updated.title   = title;
    if (Object.keys(updated).length === 0) {
      delete overrides[slug];
    } else {
      overrides[slug] = updated;
    }
  }

  saveOverrides(overrides);
  return NextResponse.json({ success: true, slug, override: overrides[slug] ?? null });
}
