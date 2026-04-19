import fs from "fs/promises";
import { runPipeline } from "./pipeline.js";
import { allProfiles, getProfile } from "../schemas/profile.examples.js";

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const urlIndex = args.indexOf("--url");
const url = urlIndex !== -1 ? args[urlIndex + 1] : undefined;

if (!url) {
  console.error("Usage: npm run render -- --url <url> [--profile <id>] [--verbose]");
  console.error(`Profiles: ${allProfiles.map((p) => p.id).join(", ")}`);
  process.exit(1);
}

const profileIds = args.flatMap((a, i) => (a === "--profile" ? [args[i + 1]] : [])).filter(Boolean);
const profiles = profileIds.length > 0 ? profileIds.map(getProfile) : [getProfile("default")];

await fs.mkdir("output", { recursive: true });

for (const profile of profiles) {
  const { outputPath } = await runPipeline(url, profile, { verbose });
  console.log(`  ✓ ${outputPath}`);
}

console.log("\nDone. Run `npm run serve` to view.");
