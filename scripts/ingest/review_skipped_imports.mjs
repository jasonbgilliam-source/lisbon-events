#!/usr/bin/env node
import fs from "fs";
import path from "path";

const exportRoot = path.join(process.cwd(), "tmp", "ingest", "export");

function latestDir(root) {
  const dirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  if (!dirs.length) {
    throw new Error(`No export directories found in ${root}`);
  }
  return dirs[dirs.length - 1];
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmpty = lines.filter((line) => line.length > 0);
  if (!nonEmpty.length) return [];

  const headers = parseCsvLine(nonEmpty[0]);
  return nonEmpty.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const out = [headers.join(",")];
  for (const row of rows) {
    out.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return out.join("\n");
}

function isValidIsoDateTime(value) {
  if (!value || !String(value).trim()) return false;
  const normalized = String(value).trim().replace("Z", "+00:00");
  const date = new Date(normalized);
  return !Number.isNaN(date.getTime());
}

const stamp = process.argv[2] || latestDir(exportRoot);
const csvPath = path.join(exportRoot, stamp, "events.csv");

if (!fs.existsSync(csvPath)) {
  throw new Error(`Missing CSV: ${csvPath}`);
}

const text = fs.readFileSync(csvPath, "utf8");
const rows = parseCsv(text);

const invalidStartsAt = rows
  .filter((row) => !isValidIsoDateTime(row.starts_at))
  .map((row) => ({
    title: row.title || "",
    starts_at: row.starts_at || "",
    ends_at: row.ends_at || "",
    source: row.source || "",
    source_url: row.source_url || "",
    url: row.url || "",
    location_name: row.location_name || "",
    city: row.city || "",
    slug: row.slug || "",
    category: row.category || "",
    image_url: row.image_url || "",
  }));

const outDir = path.join(process.cwd(), "tmp", "ingest", "review", stamp);
fs.mkdirSync(outDir, { recursive: true });

const outCsv = path.join(outDir, "invalid_starts_at_review.csv");
fs.writeFileSync(outCsv, toCsv(invalidStartsAt), "utf8");

const bySource = {};
for (const row of invalidStartsAt) {
  const key = row.source || "(blank)";
  bySource[key] = (bySource[key] || 0) + 1;
}

console.log(`Stamp: ${stamp}`);
console.log(`Input: ${csvPath}`);
console.log(`Total rows: ${rows.length}`);
console.log(`Invalid starts_at: ${invalidStartsAt.length}`);
console.log(`Review CSV: ${outCsv}`);
console.log("");
console.log("By source:");
for (const [source, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${source}: ${count}`);
}