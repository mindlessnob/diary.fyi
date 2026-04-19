import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { loadOverrides } from "@/lib/applyOverrides";

export async function GET() {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Admin disabled in production" }, { status: 403 });
  }

  const lifetimePath = path.join(process.cwd(), "src", "data", "lifetime.json");
  if (!fs.existsSync(lifetimePath)) {
    return NextResponse.json({ error: "lifetime.json not found" }, { status: 404 });
  }

  const movies: any[] = JSON.parse(fs.readFileSync(lifetimePath, "utf-8"));
  const overrides = loadOverrides();

  const merged = movies.map((m) => ({
    slug:        m.slug,
    title:       m.title,
    year:        m.year,
    poster:      overrides[m.slug]?.poster ?? m.poster ?? null,
    watchedDate: m.watchedDate,
    hasOverride: !!overrides[m.slug],
  }));

  // Sort by most recently watched first
  merged.sort((a, b) => (b.watchedDate || "").localeCompare(a.watchedDate || ""));

  return NextResponse.json({ movies: merged, overrideCount: Object.keys(overrides).length });
}
