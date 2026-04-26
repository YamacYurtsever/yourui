# Your UI

A semantic UI rendering pipeline. Takes a URL and an accessibility profile, extracts the page's content, and re-renders it as a fresh HTML/CSS page tailored to the user's needs.

```
URL + profile → scrape → extract (LLM) → render (LLM) → HTML/CSS
```

## Setup

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

## Usage

```bash
# Render a page (default profile)
npm run process -- --url https://example.com

# Render with a specific profile
npm run process -- --url https://example.com --profile low-vision

# View rendered pages in browser
npm run serve   # → http://localhost:3000
```

**Available profiles:** `default`, `low-vision`, `blind-screen-reader`, `keyboard-only`, `reduced-cognitive`, `developer`, `executive`, `complex-needs`

## How it works

Each pipeline stage is cached independently under `output/`:

| Stage | Cache | Description |
|---|---|---|
| Scrape | `output/scraped/` | Fetches and strips boilerplate HTML |
| Extract | `output/extracted/` | LLM converts HTML → `SemanticContent` JSON |
| Render | `output/rendered/` | LLM converts content + profile → HTML/CSS |

Re-running the same URL only calls the LLM for uncached stages.

## Development

```bash
npm run test      # run unit tests
npm run typecheck # run type check
```
