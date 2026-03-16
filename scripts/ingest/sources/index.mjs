import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function isSourceFile(name) {
  return name.endsWith(".mjs") && name !== "index.mjs" && !name.startsWith("_");
}

function normalizeKey(filename) {
  return filename.replace(/\.mjs$/i, "");
}

function pickScrapeFunction(mod) {
  if (typeof mod.default === "function") return mod.default;

  for (const [key, value] of Object.entries(mod)) {
    if (typeof value === "function" && /^scrape/i.test(key)) {
      return value;
    }
  }

  return null;
}

export async function loadSources() {
  const dirUrl = new URL(".", import.meta.url);
  const dirPath = fileURLToPath(dirUrl);

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  const files = entries
    .filter((entry) => entry.isFile() && isSourceFile(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const sources = [];

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const mod = await import(pathToFileURL(fullPath).href);
    const scrape = pickScrapeFunction(mod);

    if (!scrape) {
      throw new Error(
        `Source file "${file}" does not export a scrape function. Add a default export or a named export starting with "scrape".`
      );
    }

    sources.push({
      key: normalizeKey(file),
      scrape,
      file,
    });
  }

  return sources;
}
