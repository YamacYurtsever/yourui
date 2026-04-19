import { parse } from "node-html-parser";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateHtml(html: string): ValidationResult {
  const errors: string[] = [];

  // Stage 1 — strip markdown fences and check we got HTML at all
  const stripped = stripFences(html);
  if (!stripped.trimStart().startsWith("<")) {
    errors.push("Output does not start with an HTML tag — LLM may have returned prose or markdown");
    return { valid: false, errors };
  }

  // Stage 2 — parse
  let root;
  try {
    root = parse(stripped);
  } catch (e) {
    errors.push(`HTML failed to parse: ${e}`);
    return { valid: false, errors };
  }

  // Stage 3 — structural rules
  if (!root.querySelector("html")) errors.push("Missing <html> element");
  if (!root.querySelector("head")) errors.push("Missing <head> element");
  if (!root.querySelector("body")) errors.push("Missing <body> element");
  if (!root.querySelector("title")) errors.push("Missing <title> element");
  if (!root.querySelector("style")) errors.push("Missing <style> block — renderer should embed all CSS");

  const body = root.querySelector("body");
  if (body && body.innerText.trim().length === 0) {
    errors.push("<body> is empty");
  }

  return { valid: errors.length === 0, errors };
}

// Strips <script> tags from rendered HTML — the LLM occasionally emits them despite instructions.
export function sanitizeHtml(html: string): string {
  const root = parse(html);
  root.querySelectorAll("script").forEach((el) => el.remove());
  return root.toString();
}

// Strips markdown code fences from any LLM output (html, json, or plain).
export function stripFences(text: string): string {
  return text
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}
