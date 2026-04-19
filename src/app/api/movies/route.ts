import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { applyOverrides } from "@/lib/applyOverrides";

// Cache this route for 1 hour at Vercel's CDN edge.
// After the first request, subsequent requests are served instantly from cache.
// The weekly GitHub Action re-deploys the app with fresh lifetime.json anyway.
export const revalidate = 3600;

export async function GET() {
  try {
    // Using require() with static string so Turbopack bundles it successfully on Vercel
    let raw: any[];
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      raw = require("@/data/lifetime.json");
    } catch {
      return NextResponse.json({ error: "lifetime.json not found." }, { status: 404 });
    }

    const movies = applyOverrides(raw);

    return NextResponse.json({ movies }, {
      headers: {
        // Also tell the browser to cache for 10 min, CDN for 1 hour
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load insights data." }, { status: 500 });
  }
}
