import fs from "fs/promises";
import path from "path";
import { scrape, slugify } from "./scraper.js";
import { extract } from "./extractor.js";
import { render } from "./renderer.js";
import type { UserProfile } from "../schemas/profile.js";
import type { SemanticContent } from "../schemas/content.js";

// Cache layout:
//   output/scraped/<slug>.html               — scraped HTML
//   output/extracted/<slug>.json         — SemanticContent JSON
//   output/rendered/<slug>--<id>.html    — rendered HTML

const DIRS = {
  scraped: "output/scraped",
  extracted: "output/extracted",
  rendered: "output/rendered",
};

export interface PipelineOpts {
  verbose?: boolean;
}

export async function runPipeline(
  url: string,
  profile: UserProfile,
  opts: PipelineOpts = {}
): Promise<{ html: string; outputPath: string; fromCache: boolean }> {
  const log = opts.verbose ? console.log : () => {};
  const slug = slugify(url);

  await fs.mkdir(DIRS.scraped, { recursive: true });
  await fs.mkdir(DIRS.extracted, { recursive: true });
  await fs.mkdir(DIRS.rendered, { recursive: true });

  console.log(`\n[${profile.id}] ${url}`);

  const outputPath = path.join(DIRS.rendered, `${slug}--${profile.id}.html`);

  // Check render cache first — skip all LLM calls if hit
  try {
    const cached = await fs.readFile(outputPath, "utf-8");
    console.log(`  (cached render) ${outputPath}`);
    return { html: cached, outputPath, fromCache: true };
  } catch {
    // Not cached — run pipeline
  }

  console.log("  Scraping...");
  const rawHtml = await scrape(url, DIRS.scraped);
  log(`    size: ${Buffer.byteLength(rawHtml).toLocaleString()} bytes`);
  log(`    preview: ${rawHtml.slice(0, 200).replace(/\s+/g, " ").trim()}`);

  console.log("  Extracting...");
  const content = await extractCached(url, rawHtml, slug);
  log(`    title: ${content.title}`);
  log(`    blocks: ${content.body.length} (${[...new Set(content.body.map((b) => b.type))].join(", ")})`);
  log(`    json:\n${JSON.stringify(content, null, 2)}`);

  console.log("  Rendering...");
  const truncated = content.body.length > 30
    ? { ...content, body: content.body.slice(0, 30) }
    : content;
  const html = await render(truncated, profile);
  log(`    output size: ${Buffer.byteLength(html).toLocaleString()} bytes`);

  await fs.writeFile(outputPath, html, "utf-8");
  return { html, outputPath, fromCache: false };
}

async function extractCached(_url: string, html: string, slug: string): Promise<SemanticContent> {
  const cachePath = path.join(DIRS.extracted, `${slug}.json`);

  try {
    const cached = await fs.readFile(cachePath, "utf-8");
    console.log(`  (cached extraction) ${cachePath}`);
    return JSON.parse(cached) as SemanticContent;
  } catch {
    // Not cached — call LLM
  }

  const content = await extract(html);
  await fs.writeFile(cachePath, JSON.stringify(content, null, 2), "utf-8");
  return content;
}
