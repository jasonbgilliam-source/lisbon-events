import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const INPUT_CSV =
  process.env.RESCUE_INPUT_CSV || process.argv[2] || getLatestExportCsv();
const OUTPUT_DIR =
  process.env.RESCUE_OUTPUT_DIR || path.join("tmp", "ingest", "review");

function getLatestExportCsv() {
  const root = path.join("tmp", "ingest", "export");
  const stamps = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  if (!stamps.length) {
    throw new Error(`No export directories found in ${root}`);
  }

  const latest = stamps[stamps.length - 1];
  return path.join(root, latest, "events.csv");
}

function getStampFromCsvPath(csvPath) {
  const parts = csvPath.split(path.sep);
  const exportIdx = parts.lastIndexOf("export");
  if (exportIdx >= 0 && parts[exportIdx + 1]) {
    return parts[exportIdx + 1];
  }
  return nowStamp();
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate()
  )}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(
    d.getUTCSeconds()
  )}Z`;
}

function readCsv(csvPath) {
  const txt = fs.readFileSync(csvPath, "utf8");
  const parsed = Papa.parse(txt, { header: true, skipEmptyLines: true });
  return parsed.data || [];
}

function writeCsv(filePath, rows) {
  const csv = Papa.unparse(rows, { quotes: true });
  fs.writeFileSync(filePath, csv, "utf8");
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

function normalizeText(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const EDITORIAL_TITLE_PATTERNS = [
  /\bwhat to do\b/i,
  /\bthings to do\b/i,
  /\bguide\b/i,
  /\bbest concerts\b/i,
  /\ball confirmations\b/i,
  /\bmust-see events\b/i,
  /\bbuzzing this weekend\b/i,
  /\bweekend\b/i,
  /\bso far\b/i,
  /\bhidden corners\b/i,
  /\bbest places\b/i,
  /\bwhere to eat\b/i,
  /\bwhere to stay\b/i,
];

const EDITORIAL_SLUG_PATTERNS = [
  /what-to-do/i,
  /music-concerts/i,
  /nos-alive/i,
];

const LIKELY_EVENT_TITLE_PATTERNS = [
  /\bfestival\b/i,
  /\bfair\b/i,
  /\bmarket\b/i,
  /\bconcert\b/i,
  /\bconcerto\b/i,
  /\bopera\b/i,
  /\bmusical\b/i,
  /\bfilm\b/i,
  /\bcinema\b/i,
  /\bexhibition\b/i,
  /\bmarathon\b/i,
  /\brun\b/i,
  /\bworkshop\b/i,
  /\bfeira\b/i,
  /\bmercado\b/i,
  /\bparade\b/i,
];

function isMissingStart(row) {
  return !firstNonEmpty(row.starts_at);
}

function isEditorial(row) {
  const title = firstNonEmpty(row.title);
  const slug = firstNonEmpty(row.slug);

  if (EDITORIAL_TITLE_PATTERNS.some((rx) => rx.test(title))) return true;
  if (EDITORIAL_SLUG_PATTERNS.some((rx) => rx.test(slug))) return true;

  return false;
}

function isLikelyEvent(row) {
  const title = firstNonEmpty(row.title);
  const source = normalizeText(row.source);
  const url = firstNonEmpty(row.url, row.source_url);

  if (!title) return false;
  if (!url) return false;

  if (LIKELY_EVENT_TITLE_PATTERNS.some((rx) => rx.test(title))) return true;

  if (source === "visitlisboa") return true;
  if (source === "lisboa_secreta") return true;

  return false;
}

function main() {
  const rows = readCsv(INPUT_CSV);
  const stamp = getStampFromCsvPath(INPUT_CSV);
  const outDir = path.join(OUTPUT_DIR, stamp);

  fs.mkdirSync(outDir, { recursive: true });

  const missingDateRows = rows.filter(isMissingStart);
  const editorialRows = missingDateRows.filter(isEditorial);
  const rescueRows = missingDateRows.filter(
    (row) => !isEditorial(row) && isLikelyEvent(row)
  );
  const reviewRows = missingDateRows.filter(
    (row) => !isEditorial(row) && !isLikelyEvent(row)
  );

  const addReason = (row, reason) => ({ ...row, rescue_reason: reason });

  const rescueOut = rescueRows.map((row) => addReason(row, "missing_starts_at"));
  const editorialOut = editorialRows.map((row) =>
    addReason(row, "editorial_skip")
  );
  const reviewOut = reviewRows.map((row) =>
    addReason(row, "missing_starts_at_manual_review")
  );

  const rescueCsv = path.join(outDir, "rescue_candidates.csv");
  const editorialCsv = path.join(outDir, "editorial_skipped.csv");
  const reviewCsv = path.join(outDir, "missing_date_review.csv");

  writeCsv(rescueCsv, rescueOut);
  writeCsv(editorialCsv, editorialOut);
  writeCsv(reviewCsv, reviewOut);

  const summary = {
    input_csv: INPUT_CSV,
    total_rows: rows.length,
    missing_start_rows: missingDateRows.length,
    rescue_candidates: rescueOut.length,
    editorial_skipped: editorialOut.length,
    manual_review: reviewOut.length,
    rescue_csv: rescueCsv,
    editorial_csv: editorialCsv,
    review_csv: reviewCsv,
  };

  const summaryPath = path.join(outDir, "rescue_candidates_summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");

  console.log(`Input rows:             ${rows.length}`);
  console.log(`Missing starts_at:      ${missingDateRows.length}`);
  console.log(`Rescue candidates:      ${rescueOut.length}`);
  console.log(`Editorial skipped:      ${editorialOut.length}`);
  console.log(`Manual review:          ${reviewOut.length}`);
  console.log(``);
  console.log(`Rescue CSV:             ${rescueCsv}`);
  console.log(`Editorial CSV:          ${editorialCsv}`);
  console.log(`Manual review CSV:      ${reviewCsv}`);
  console.log(`Summary JSON:           ${summaryPath}`);
}

main();
