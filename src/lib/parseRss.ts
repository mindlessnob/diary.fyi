// src/lib/parseRss.ts
import { XMLParser } from "fast-xml-parser";

export interface Movie {
  slug?: string;
  title: string;
  year: string;
  rating: number | null;
  watchedDate: string; // "YYYY-MM-DD"
  poster: string;
  link: string;
  review: string;
  isRewatch: boolean;
}

function extractPoster(description: string): string {
  const match = description.match(/<img src="([^"]+)"/);
  return match ? match[1] : "";
}

function extractReview(description: string): string {
  return decodeEntities(
    description
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

// Decode common HTML entities that Letterboxd includes in RSS fields
function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\.+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&nbsp;/g, " ");
}

function toStarString(rating: number | null): string {
  if (rating === null) return "";
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return "★".repeat(full) + (half ? "½" : "");
}

export { toStarString };

export function parseRss(xml: string): Movie[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: "__cdata",
    isArray: (name) => name === "item",
  });

  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item ?? [];

  return items
    .map((item: Record<string, unknown>): Movie | null => {
      // Letterboxd namespace keys come through as "letterboxd:xxx"
      const watchedDate =
        (item["letterboxd:watchedDate"] as string) ?? "";
      if (!watchedDate) return null; // skip non-diary entries (list updates etc.)

      const rawTitle = decodeEntities(
        (item["letterboxd:filmTitle"] as string) ??
        (item.title as string) ??
        "Unknown"
      );

      const year = String(item["letterboxd:filmYear"] ?? "");
      const ratingRaw = item["letterboxd:memberRating"];
      const rating =
        ratingRaw !== undefined && ratingRaw !== ""
          ? parseFloat(String(ratingRaw))
          : null;

      // description is CDATA
      const descriptionRaw = item.description;
      let descriptionStr = "";
      if (typeof descriptionRaw === "object" && descriptionRaw !== null) {
        descriptionStr =
          (descriptionRaw as { __cdata?: string }).__cdata ?? "";
      } else if (typeof descriptionRaw === "string") {
        descriptionStr = descriptionRaw;
      }

      const poster = extractPoster(descriptionStr);
      const review = extractReview(descriptionStr);

      const link = (item.link as string) ?? "";
      const isRewatch =
        String(item["letterboxd:rewatch"] ?? "No").toLowerCase() === "yes";

      return {
        title: rawTitle,
        year,
        rating,
        watchedDate,
        poster,
        link,
        review,
        isRewatch,
      };
    })
    .filter((m: Movie | null): m is Movie => m !== null);
}
