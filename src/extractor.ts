import Anthropic from "@anthropic-ai/sdk";
import type { SemanticContent } from "../schemas/content.js";
import { stripFences } from "./validate.js";

const client = new Anthropic();

const SYSTEM_PROMPT = `
You are a semantic content extractor. Given raw HTML for a web page, extract its primary content into a JSON object matching the SemanticContent schema below.

Rules:
- Output ONLY a valid JSON object — no markdown fences, no explanation
- Extract only the primary page content; drop navigation chrome, cookie banners, ads, sidebars, and footer boilerplate
- Use HeadingBlocks (level 1–4) to represent section titles — do not nest sections
- Populate editorial metadata (authors, publishedAt, tags) only when clearly present in the HTML
- Populate breadcrumb/links only when present in the HTML
- Map <blockquote> → QuoteBlock, <pre><code> → CodeBlock, .note/.warning/.tip class patterns → CalloutBlock
- Never invent content not present in the HTML

Schema (TypeScript):

\`\`\`ts
interface Author { name: string; url?: string }
interface MediaItem { url: string; alt: string; caption?: string }
interface Link { label: string; url: string }

type BodyBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 1 | 2 | 3 | 4; text: string; id?: string }
  | { type: "code"; language?: string; code: string; caption?: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "callout"; intent: "info" | "warning" | "danger" | "tip"; text: string }
  | { type: "image"; media: MediaItem }
  | { type: "quote"; text: string; attribution?: string }

interface SemanticContent {
  title: string;
  description?: string;
  authors?: Author[];
  publishedAt?: string;   // ISO 8601
  updatedAt?: string;     // ISO 8601
  tags?: string[];
  breadcrumb?: Link[];
  links?: Link[];
  body: BodyBlock[];      // required, non-empty
}
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
