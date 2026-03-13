import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fetch } from "undici";
import Papa from "papaparse";

import { scrapeLisboaSecreta } from "./sources/lisboa_secreta.mjs";
import { scrapeVisitLisboa } from "./sources/visitlisboa.mjs";

const SOURCES = [
  {
    key: "lisboa_secreta",
    scrape: scrapeLisboaSecreta,
  },
  {
    key: "visitlisboa",
    scrape: scrapeVisitLisboa,
  },
];

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate()
  )}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(
    d.getUTCSeconds()
  )}Z`;
}

function sha1(s) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function safeMkdir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function normalizeUrl(u) {
  try {
    const url = new URL(u);
    url.hash = "";
    return url.toString();
  } catch {
    return u;
  }
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return [];
    return [s];
  }
  return [];
}

function normalizeOccurrenceList(event) {
  if (Array.isArray(event?.occurrences) && event.occurrences.length > 0) {
    return event.occurrences;
  }

  const starts_at = event?.starts_at || "";
  const ends_at = event?.ends_at || "";

  if (starts_at || ends_at) {
    return [
      {
        starts_at,
        ends_at,
        date_text: "",
      },
    ];
  }

  return [{}];
}

function canonicalSourceUrl(event) {
  return event?.source_url || event?.url || "";
}

function buildRowsFromCanonical(events) {
  const rows = [];

  for (const e of events) {
    const occs = normalizeOccurrenceList(e);

    for (const occ of occs) {
      const starts = occ?.starts_at || "";
      const ends = occ?.ends_at || "";
      const url = canonicalSourceUrl(e);

      const keyBase = [
        (e?.title || "").toLowerCase().trim(),
        normalizeUrl(url),
        starts,
      ].join("|");

      const dedupe_key = e?.dedupe_key || sha1(keyBase);

      const audienceValues = toArray(e?.audience);
      const audience =
        audienceValues.length > 0 ? audienceValues.join(", ") : "";

      rows.push({
        title: e?.title || "",
        starts_at: starts,
        ends_at: ends,

        location_name: e?.location_name || "",
        address: e?.address || "",
        city: e?.city || "",

        url,
        image_url: e?.image_url || "",

        category: e?.category || "",
        audience,
        price: e?.price || "",

        status: e?.status || "approved",

        source: e?.source || "",
        source_id: e?.source_id || "",
        source_url: url,

        dedupe_key,
      });
    }
  }

  return rows;
}

async function runSource(source, rawBase) {
  try {
    const result = await source.scrape({ fetch, rawBase });

    const events = Array.isArray(result?.events) ? result.events : [];
    const debug = result?.debug ?? {};

    return {
      key: source.key,
      events,
      debug,
      ok: true,
    };
  } catch (error) {
    return {
      key: source.key,
      events: [],
      debug: {
        error: String(error?.stack || error?.message || error),
      },
      ok: false,
    };
  }
}

function loadApprovedAiRescues(stamp) {
  const filePath = path.join(
    "tmp",
    "ingest",
    "review",
    stamp,
    "lisboa_secreta_ai_approved_rescues.json"
  );

  if (!fs.existsSync(filePath)) {
    return { events: [], filePath, found: false };
  }

  try {
    const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const events = Array.isArray(json?.approved_rescues) ? json.approved_rescues : [];
    return { events, filePath, found: true };
  } catch (error) {
    console.warn(`Failed to read AI approved rescues from ${filePath}:`, error);
    return { events: [], filePath, found: true };
  }
}

async function main() {
  const stamp = process.env.INGEST_STAMP || nowStamp();

  const rawBase = path.join("tmp", "ingest", "raw", stamp);
  const normBase = path.join("tmp", "ingest", "normalized", stamp);
  const outBase = path.join("tmp", "ingest", "export", stamp);

  safeMkdir(rawBase);
  safeMkdir(normBase);
  safeMkdir(outBase);

  const results = [];
  let allEvents = [];

  for (const source of SOURCES) {
    console.log(`▶ Running source: ${source.key}`);
    const result = await runSource(source, rawBase);
    results.push(result);
    allEvents = allEvents.concat(result.events);

    const normPath = path.join(normBase, `${source.key}.json`);
    fs.writeFileSync(
      normPath,
      JSON.stringify(
        {
          debug: result.debug,
          events: result.events,
        },
        null,
        2
      )
    );

    console.log(
      `${result.ok ? "✅" : "⚠️"} ${source.key}: ${result.events.length} events → ${normPath}`
    );
  }

  const aiRescue = loadApprovedAiRescues(stamp);
  if (aiRescue.events.length > 0) {
    console.log(`🤖 Merging approved AI rescues: ${aiRescue.events.length} from ${aiRescue.filePath}`);
    allEvents = allEvents.concat(aiRescue.events);
  } else if (aiRescue.found) {
    console.log(`🤖 AI rescue file found, but no approved rescues: ${aiRescue.filePath}`);
  } else {
    console.log(`🤖 No AI rescue file found for stamp ${stamp}`);
  }

  const debug = Object.fromEntries(results.map((r) => [r.key, r.debug]));
  const rows = buildRowsFromCanonical(allEvents);

  const csv = Papa.unparse(rows);
  const outPath = path.join(outBase, "events.csv");
  fs.writeFileSync(outPath, csv);

  const summaryPath = path.join(outBase, "summary.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        stamp,
        total_sources: SOURCES.length,
        total_events: allEvents.length,
        total_rows: rows.length,
        ai_approved_rescues: aiRescue.events.length,
        ai_rescue_file_found: aiRescue.found,
        by_source: results.map((r) => ({
          key: r.key,
          ok: r.ok,
          events: r.events.length,
        })),
        debug,
        output_csv: outPath,
      },
      null,
      2
    )
  );

  console.log("🎉 DONE");
  console.log("Stamp:", stamp);
  console.log("Sources:", SOURCES.length);
  console.log("Events:", allEvents.length);
  console.log("Rows:", rows.length);
  console.log("CSV:", outPath);
  console.log("Summary:", summaryPath);
}

main();
