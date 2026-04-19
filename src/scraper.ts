import fs from "fs/promises";
import path from "path";
import { parse } from "node-html-parser";

const MAX_BYTES = 80_000;

export function slugify(url: string): string {
  return url.replace(/https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function scrape(url: string, cacheDir = "output/scraped"): Promise<string> {
  await fs.mkdir(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, `${slugify(url)}.html`);

  // Return cached version if available
  try {
    const cached = await fs.readFile(cachePath, "utf-8");
    console.log(`  (cached scrape) ${cachePath}`);
    return cached;
  } catch {
    // Not cached yet — fetch
  }

  console.log(`  Fetching ${url}`);
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; yourui-scraper/0.1)" } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);

  const raw = await res.text();
  const cleaned = clean(raw);

  await fs.writeFile(cachePath, cleaned, "utf-8");
  return cleaned;
}

function clean(html: string): string {
  const root = parse(html);

  // Remove noise — none of these carry primary content
  for (const tag of ["script", "style", "nav", "footer", "aside", "header", "iframe", "noscript"]) {
    root.querySelectorAll(tag).forEach((el) => el.remove());
  }

  const cleaned = root.toString();

  // Truncate if still too large
  if (Buffer.byteLength(cleaned) > MAX_BYTES) {
    return Buffer.from(cleaned).subarray(0, MAX_BYTES).toString("utf-8");
  }

  return cleaned;
}
