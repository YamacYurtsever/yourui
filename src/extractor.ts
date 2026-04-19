import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { SemanticContent } from "../schemas/content.js";
import { stripFences } from "./validate.js";

const client = new Anthropic();

const schemaPath = path.resolve(fileURLToPath(import.meta.url), "../../schemas/content.ts");
const schemaSource = fs.readFileSync(schemaPath, "utf-8");

const SYSTEM_PROMPT = `You are a semantic content extractor. Given raw HTML for a web page, extract its primary content into a JSON object matching the SemanticContent schema below.

Rules:
- Output ONLY a valid JSON object — no markdown fences, no explanation
- Extract only the primary page content; drop navigation chrome, cookie banners, ads, sidebars, and footer boilerplate
- Use HeadingBlocks (level 1–4) to represent section titles — do not nest sections
- Populate editorial metadata (authors, publishedAt, tags) only when clearly present in the HTML
- Populate breadcrumb/links only when present in the HTML
- Map <blockquote> → QuoteBlock, <pre><code> → CodeBlock, .note/.warning/.tip class patterns → CalloutBlock
- Never invent content not present in the HTML

Schema (TypeScript source of truth):

\`\`\`ts
${schemaSource}
\`\`\``;

export async function extract(html: string): Promise<SemanticContent> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: html }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from extractor");

  const raw = stripFences(block.text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Extractor returned invalid JSON:\n${raw.slice(0, 300)}`);
  }

  return validateSemanticContent(parsed);
}

export function validateSemanticContent(data: unknown): SemanticContent {
  if (typeof data !== "object" || data === null) {
    throw new Error("Extractor output is not an object");
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj.title !== "string" || obj.title.trim() === "") {
    throw new Error("Extractor output missing required field: title");
  }
  if (!Array.isArray(obj.body) || obj.body.length === 0) {
    throw new Error("Extractor output missing required field: body (must be a non-empty array)");
  }

  return data as SemanticContent;
}
