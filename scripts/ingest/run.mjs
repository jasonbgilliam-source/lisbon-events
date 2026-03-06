import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fetch } from "undici";
import Papa from "papaparse";

import { scrapeLisboaSecreta } from "./sources/lisboa_secreta.mjs";
import { scrapeVisitLisboa } from "./sources/visitlisboa.mjs";

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

function buildRowsFromCanonical(events) {
  const rows = [];

  for (const e of events) {
    const occs =
      Array.isArray(e.occurrences) && e.occurrences.length
        ? e.occurrences
        : [{}];

    for (const occ of occs) {
      const starts = occ.starts_at || "";
      const ends = occ.ends_at || "";

      const keyBase = [
        (e.title || "").toLowerCase().trim(),
        normalizeUrl(e.source_url || ""),
        starts,
      ].join("|");

      const dedupe_key = sha1(keyBase);

      rows.push({
        title: e.title || "",
        starts_at: starts,
        ends_at: ends,

        location_name: e.location_name || "",
        address: e.address || "",
        city: e.city || "",

        url: e.source_url || "",
        image_url: e.image_url || "",

        category: "",
        audience: "",
        price: "",

        status: "approved",

        source: e.source || "",
        source_id: e.source_id || "",
        source_url: e.source_url || "",

        dedupe_key,
      });
    }
  }

  return rows;
}

async function main() {
  const stamp = nowStamp();

  const rawBase = path.join("tmp", "ingest", "raw", stamp);
  const normBase = path.join("tmp", "ingest", "normalized", stamp);
  const outBase = path.join("tmp", "ingest", "export", stamp);

  safeMkdir(rawBase);
  safeMkdir(normBase);
  safeMkdir(outBase);

  let allEvents = [];
  let debug = {};

  const lisboa = await scrapeLisboaSecreta({ fetch, rawBase });
  allEvents = allEvents.concat(lisboa.events);

  const visit = await scrapeVisitLisboa({ fetch, rawBase });
  allEvents = allEvents.concat(visit.events);

  debug = {
    lisboa_secreta: lisboa.debug,
    visitlisboa: visit.debug,
  };

  // write separate normalized files per source
  const lisboaNormPath = path.join(normBase, "lisboa_secreta.json");
  fs.writeFileSync(
    lisboaNormPath,
    JSON.stringify({ debug: lisboa.debug, events: lisboa.events }, null, 2)
  );

  const visitNormPath = path.join(normBase, "visitlisboa.json");
  fs.writeFileSync(
    visitNormPath,
    JSON.stringify({ debug: visit.debug, events: visit.events }, null, 2)
  );

  const events = allEvents;
  const rows = buildRowsFromCanonical(events);

  const csv = Papa.unparse(rows);
  const outPath = path.join(outBase, "events.csv");
  fs.writeFileSync(outPath, csv);

  console.log("✅ normalized written:", lisboaNormPath, "and", visitNormPath);
  console.log("🎉 DONE");
  console.log("Events:", events.length);
  console.log("CSV:", outPath);
}

main();