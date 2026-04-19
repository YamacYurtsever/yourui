import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { stripFences, validateHtml } from "../src/validate.js";

describe("stripFences", () => {
  test("strips html fences", () => {
    assert.equal(stripFences("```html\n<p>hi</p>\n```"), "<p>hi</p>");
  });

  test("strips json fences", () => {
    assert.equal(stripFences("```json\n{}\n```"), "{}");
  });

  test("strips plain fences", () => {
    assert.equal(stripFences("```\n<p>hi</p>\n```"), "<p>hi</p>");
  });

  test("leaves unfenced text unchanged", () => {
    assert.equal(stripFences("<p>hi</p>"), "<p>hi</p>");
  });
});

describe("validateHtml", () => {
  const validPage = `<!DOCTYPE html>
<html lang="en">
<head><title>Test</title><style>body{}</style></head>
<body><p>Hello</p></body>
</html>`;

  test("accepts a valid page", () => {
    const result = validateHtml(validPage);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  test("rejects non-HTML output", () => {
    const result = validateHtml("Here is your HTML page...");
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].includes("does not start with an HTML tag"));
  });

  test("rejects page missing <title>", () => {
    const html = `<html><head><style>body{}</style></head><body><p>hi</p></body></html>`;
    const result = validateHtml(html);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("<title>")));
  });

  test("rejects page missing <style>", () => {
    const html = `<html><head><title>T</title></head><body><p>hi</p></body></html>`;
    const result = validateHtml(html);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("<style>")));
  });

  test("accepts page with <script> tags (scripts are stripped by sanitizeHtml before validation)", () => {
    const html = `<html><head><title>T</title><style>body{}</style></head><body><script>alert(1)</script><p>hi</p></body></html>`;
    const result = validateHtml(html);
    assert.equal(result.valid, true);
  });

  test("rejects page with empty body", () => {
    const html = `<html><head><title>T</title><style>body{}</style></head><body></body></html>`;
    const result = validateHtml(html);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("empty")));
  });

  test("strips fences before validating", () => {
    const fenced = "```html\n" + validPage + "\n```";
    const result = validateHtml(fenced);
    assert.equal(result.valid, true);
  });
});
