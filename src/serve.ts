import http from "http";
import fs from "fs/promises";
import path from "path";

const PORT = 3000;
const OUTPUT_DIR = "output/rendered";

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
};

const server = http.createServer(async (req, res) => {
  const url = req.url ?? "/";

  // Index page — links to all rendered files
  if (url === "/" || url === "/index.html") {
    const files = (await fs.readdir(OUTPUT_DIR).catch(() => [])).filter((f) =>
      f.endsWith(".html")
    );
    const links = files
      .map((f) => `<li><a href="/${f}">${f.replace(".html", "")}</a></li>`)
      .join("\n");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>YourUI</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 4rem auto; padding: 0 1rem; }
    h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
    p { color: #666; margin-bottom: 1.5rem; }
    ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    a { display: inline-block; padding: 0.6rem 1rem; background: #f3f4f6; border-radius: 6px;
        text-decoration: none; color: #111; font-weight: 500; }
    a:hover { background: #e5e7eb; }
  </style>
</head>
<body>
  <h1>YourUI</h1>
  <ul>${links || "<li>No pages</li>"}</ul>
</body>
</html>
    `);
    return;
  }

  // Serve files from output/
  const filename = path.basename(url);
  const filepath = path.join(OUTPUT_DIR, filename);
  const ext = path.extname(filename);

  try {
    const content = await fs.readFile(filepath);
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "text/plain" });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Serving at http://localhost:${PORT}`);
});
