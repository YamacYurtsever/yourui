import Anthropic from "@anthropic-ai/sdk";
import type { SemanticContent } from "../schemas/content.js";
import type { UserProfile } from "../schemas/profile.js";
import { validateHtml, sanitizeHtml, stripFences } from "./validate.js";

const client = new Anthropic();

const SYSTEM_PROMPT = `
You are a UI renderer. Given structured semantic content and a user profile, produce a complete, self-contained HTML page with embedded CSS.

Rules:
- Output ONLY valid HTML — no markdown, no explanation, no code fences
- Embed all styles in a <style> tag in <head>
- Use semantic HTML elements (article, nav, h1-h4, code, blockquote, etc.)
- Let the user profile drive every visual decision: font size, spacing, contrast, layout density
- For screen reader profiles: emit clean semantic HTML with proper ARIA landmarks; visual layout is irrelevant
- For reduced cognitive load profiles: use plain language summaries, generous whitespace, hide code blocks
- Never invent content not present in the input
`;

function buildPrompt(content: SemanticContent, profile: UserProfile): string {
  return `
Render the following content for the given profile.

## Profile
${JSON.stringify(profile, null, 2)}

## Content
${JSON.stringify(content, null, 2)}
  `;
}

export async function render(
  content: SemanticContent,
  profile: UserProfile
): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildPrompt(content, profile),
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");

  const sanitized = sanitizeHtml(stripFences(block.text));

  const result = validateHtml(sanitized);
  if (!result.valid) {
    throw new Error(`LLM output failed validation:\n${result.errors.join("\n")}`);
  }

  return sanitized;
}
