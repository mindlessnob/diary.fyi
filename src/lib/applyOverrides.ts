import * as fs from "fs";
import * as path from "path";

/** Merges overrides.json on top of any array of objects that have a `slug` field. */
export function applyOverrides<T extends { slug: string }>(movies: T[]): T[] {
  const overridesPath = path.join(process.cwd(), "src", "data", "overrides.json");
  if (!fs.existsSync(overridesPath)) return movies;

  let overrides: Record<string, Partial<T>>;
  try {
    overrides = JSON.parse(fs.readFileSync(overridesPath, "utf-8"));
  } catch {
    return movies;
  }

  return movies.map((m) => {
    const ov = overrides[m.slug];
    return ov ? { ...m, ...ov } : m;
  });
}

/** Return the raw overrides map (for the admin UI). */
export function loadOverrides(): Record<string, any> {
  const overridesPath = path.join(process.cwd(), "src", "data", "overrides.json");
  if (!fs.existsSync(overridesPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(overridesPath, "utf-8"));
  } catch {
    return {};
  }
}

/** Write the overrides map back to disk. */
export function saveOverrides(overrides: Record<string, any>): void {
  const overridesPath = path.join(process.cwd(), "src", "data", "overrides.json");
  fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 2));
}
