import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly include data files in Vercel serverless function bundles.
  // Without this, Next.js output file tracing misses dynamically-constructed
  // fs paths (path.join(process.cwd(), "src/data/...")) and the JSON files
  // are not available inside Vercel lambda functions at runtime.
  outputFileTracingIncludes: {
    "/api/calendar": ["./src/data/**"],
    "/api/movies":   ["./src/data/**"],
    "/api/profile":  ["./src/data/**"],
    "/api/admin/films": ["./src/data/**"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "a.ltrbxd.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
