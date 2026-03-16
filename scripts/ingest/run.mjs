import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fetch } from "undici";
import Papa from "papaparse";
import { loadSources } from "./sources/index.mjs";

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate()
  )}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
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
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return u || "";
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
  return [String(value).trim()].filter(Boolean);
}

function parseDateOnly(value) {
  if (!value) return "";
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function slugify(input) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function canonicalEventSlug(event) {
  if (event?.slug && String(event.slug).trim()) {
    return String(event.slug).trim();
  }

  if (event?.url) {
    try {
      const u = new URL(event.url);
      const parts = u.pathname.split("/").filter(Boolean);
      const last = parts[parts.length - 1];
      if (last) return slugify(last);
    } catch {}
  }

  if (event?.source && event?.source_id) {
    return slugify(`${event.source}-${event.source_id}`);
  }

  return slugify(`${event?.title || "event"}-${event?.starts_at || ""}`);
}

function buildOccurrenceDateList(event) {
  const directOccurrences = Array.isArray(event?.occurrences) ? event.occurrences : [];
  const rawOccurrences = Array.isArray(event?.raw_occurrences) ? event.raw_occurrences : [];

  const collected = [];

  for (const item of directOccurrences) {
    if (typeof item === "string") {
      const d = parseDateOnly(item);
      if (d) collected.push(d);
      continue;
    }

    if (item && typeof item === "object") {
      const starts = parseDateOnly(item.starts_at || item.date || "");
      if (starts) collected.push(starts);
    }
  }

  for (const item of rawOccurrences) {
    if (typeof item === "string") {
      const d = parseDateOnly(item);
      if (d) collected.push(d);
      continue;
    }

    if (item && typeof item === "object") {
      const starts = parseDateOnly(item.starts_at || item.date || "");
      if (starts) collected.push(starts);
    }
  }

  const fallbackStart = parseDateOnly(event?.starts_at || "");
  if (collected.length === 0 && fallbackStart) {
    collected.push(fallbackStart);
  }

  return uniqueStrings(collected).sort();
}

function canonicalSourceUrl(event) {
  return event?.source_url || event?.url || "";
}

function canonicalKeyForEvent(event) {
  return slugify(
    [event?.title || "", event?.location_name || "", parseDateOnly(event?.starts_at || "")]
      .join(" ")
      .trim()
  );
}

function normalizeCanonicalEvent(sourceKey, event) {
  const slug = canonicalEventSlug(event);
  const sourceUrl = canonicalSourceUrl(event);

  return {
    slug,
    canonical_key: canonicalKeyForEvent(event),
    title: event?.title || "",
    description: event?.description || "",
    starts_at: event?.starts_at || "",
    ends_at: event?.ends_at || "",
    location_name: event?.location_name || "",
    address: event?.address || "",
    city: event?.city || "Lisbon",
    url: event?.url || sourceUrl || "",
    image_url: event?.image_url || "",
    category: event?.category || "",
    audience: toArray(event?.audience),
    price: event?.price || "",
    status: event?.status || "approved",
    source: event?.source || sourceKey,
    source_id: event?.source_id || "",
    source_url: sourceUrl,
    description_long: event?.description_long || "",
    tags: toArray(event?.tags),
    accessibility: toArray(event?.accessibility),
    raw_categories: toArray(event?.raw_categories),
    raw_target_audience: toArray(event?.raw_target_audience),
    raw_accessibility: toArray(event?.raw_accessibility),
    latitude: event?.latitude ?? "",
    longitude: event?.longitude ?? "",
    venue_url: event?.venue_url || "",
    venue_contact: event?.venue_contact || "",
    venue_extra_info: event?.venue_extra_info || "",
    venue_schedule: event?.venue_schedule || "",
    venue_category: event?.venue_category || "",
    venue_district: event?.venue_district || "",
    venue_accessibility: toArray(event?.venue_accessibility),
    venue_tags: toArray(event?.venue_tags),
    occurrences: Array.isArray(event?.occurrences) ? event.occurrences : [],
    raw_occurrences: Array.isArray(event?.raw_occurrences) ? event.raw_occurrences : [],
  };
}

function dedupeCanonicalEvents(events) {
  const seen = new Set();
  const result = [];

  for (const event of events) {
    const source = String(event.source || "").trim();
    const sourceId = String(event.source_id || "").trim();
    const slug = String(event.slug || "").trim();
    const url = normalizeUrl(event.source_url || event.url || "");

    const key = [source, sourceId, slug, url].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }

  return result;
}

function buildRowsFromCanonical(events) {
  const rows = [];

  for (const e of events) {
    const url = canonicalSourceUrl(e);

    const keyBase = [
      (e?.title || "").toLowerCase().trim(),
      normalizeUrl(url),
      parseDateOnly(e?.starts_at || ""),
    ].join("|");

    const dedupe_key = e?.dedupe_key || sha1(keyBase);

    rows.push({
      slug: canonicalEventSlug(e),
      canonical_key: e?.canonical_key || canonicalKeyForEvent(e),
      title: e?.title || "",
      starts_at: e?.starts_at || "",
      ends_at: e?.ends_at || "",
      location_name: e?.location_name || "",
      address: e?.address || "",
      city: e?.city || "",
      url,
      image_url: e?.image_url || "",
      category: e?.category || "",
      audience: toArray(e?.audience).join(", "),
      price: e?.price || "",
      status: e?.status || "approved",
      source: e?.source || "",
      source_id: e?.source_id || "",
      source_url: url,
      dedupe_key,
      description: e?.description || "",
      tags: toArray(e?.tags).join(", "),
      accessibility: toArray(e?.accessibility).join(", "),
      raw_categories: toArray(e?.raw_categories).join(", "),
      raw_target_audience: toArray(e?.raw_target_audience).join(", "),
      raw_accessibility: toArray(e?.raw_accessibility).join(", "),
      latitude: e?.latitude ?? "",
      longitude: e?.longitude ?? "",
      venue_url: e?.venue_url || "",
      venue_contact: e?.venue_contact || "",
      venue_extra_info: e?.venue_extra_info || "",
      venue_schedule: e?.venue_schedule || "",
      venue_category: e?.venue_category || "",
      venue_district: e?.venue_district || "",
      venue_accessibility: toArray(e?.venue_accessibility).join(", "),
      venue_tags: toArray(e?.venue_tags).join(", "),
    });
  }

  return rows;
}

function buildOccurrenceRows(events) {
  const rows = [];

  for (const e of events) {
    const event_slug = canonicalEventSlug(e);
    const occurrenceDates = buildOccurrenceDateList(e);

    for (const occurrence_date of occurrenceDates) {
      rows.push({
        event_slug,
        occurrence_date,
        starts_at: e?.starts_at || "",
        ends_at: e?.ends_at || "",
        is_all_day: "true",
        source: e?.source || "",
        source_id: e?.source_id || "",
        title: e?.title || "",
        url: e?.url || "",
      });
    }
  }

  return rows;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function writeCsv(filePath, rows) {
  const csv = Papa.unparse(rows, {
    quotes: false,
    skipEmptyLines: true,
  });
  fs.writeFileSync(filePath, csv, "utf8");
}

async function runSource(source, rawBase) {
  const startedAt = Date.now();

  try {
    console.log(`▶ Running source: ${source.key}`);

    const result = await source.scrape({ fetch, rawBase });
    const rawEvents = Array.isArray(result?.events) ? result.events : [];
    const debug = result?.debug ?? {};
    const events = rawEvents.map((event) => normalizeCanonicalEvent(source.key, event));

    const durationMs = Date.now() - startedAt;

    console.log(`✅ ${source.key}: ${events.length} events in ${durationMs}ms`);

    return {
      ok: true,
      key: source.key,
      events,
      debug,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);

    console.error(`❌ ${source.key}: ${message}`);

    return {
      ok: false,
      key: source.key,
      events: [],
      debug: {},
      durationMs,
      error: message,
    };
  }
}

async function main() {
  const stamp = process.env.INGEST_STAMP || nowStamp();
  const repoRoot = process.cwd();

  const tmpBase = path.join(repoRoot, "tmp", "ingest");
  const rawBase = path.join(tmpBase, "raw", stamp);
  const normalizedBase = path.join(tmpBase, "normalized", stamp);
  const exportBase = path.join(tmpBase, "export", stamp);
  const reviewBase = path.join(tmpBase, "review", stamp);
  const publicBase = path.join(repoRoot, "public");

  safeMkdir(rawBase);
  safeMkdir(normalizedBase);
  safeMkdir(exportBase);
  safeMkdir(reviewBase);
  safeMkdir(publicBase);

  const sources = await loadSources();

  if (sources.length === 0) {
    throw new Error("No ingest sources found in scripts/ingest/sources");
  }

  console.log(`🚀 Running ${sources.length} sources in parallel`);
  console.log(`📦 Sources: ${sources.map((s) => s.key).join(", ")}`);

  const results = await Promise.all(sources.map((source) => runSource(source, rawBase)));

  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  for (const result of results) {
    const normalizedPath = path.join(normalizedBase, `${result.key}.json`);
    writeJson(normalizedPath, {
      ok: result.ok,
      key: result.key,
      count: result.events.length,
      durationMs: result.durationMs,
      error: result.error || null,
      debug: result.debug || {},
      events: result.events,
    });
  }

  const allEvents = succeeded.flatMap((r) => r.events);
  const dedupedEvents = dedupeCanonicalEvents(allEvents);
  const eventRows = buildRowsFromCanonical(dedupedEvents);
  const occurrenceRows = buildOccurrenceRows(dedupedEvents);

  writeJson(path.join(exportBase, "events.json"), dedupedEvents);
  writeJson(path.join(exportBase, "event_occurrences.json"), occurrenceRows);
  writeJson(path.join(exportBase, "run_summary.json"), {
    stamp,
    source_count: sources.length,
    succeeded: succeeded.map((r) => ({
      key: r.key,
      count: r.events.length,
      durationMs: r.durationMs,
    })),
    failed: failed.map((r) => ({
      key: r.key,
      error: r.error || "Unknown error",
      durationMs: r.durationMs,
    })),
    totals: {
      raw_events: allEvents.length,
      deduped_events: dedupedEvents.length,
      occurrence_rows: occurrenceRows.length,
    },
  });

  writeCsv(path.join(exportBase, "events.csv"), eventRows);
  writeCsv(path.join(exportBase, "event_occurrences.csv"), occurrenceRows);

  writeCsv(path.join(publicBase, "events.csv"), eventRows);
  writeCsv(path.join(publicBase, "event_occurrences.csv"), occurrenceRows);

  console.log("");
  for (const result of succeeded) {
    console.log(`${result.key}: ${result.events.length}`);
  }

  if (failed.length > 0) {
    console.log("");
    for (const result of failed) {
      console.log(`FAILED ${result.key}: ${result.error}`);
    }
  }

  console.log("");
  console.log(`total raw: ${allEvents.length}`);
  console.log(`total deduped: ${dedupedEvents.length}`);
  console.log(`total occurrences: ${occurrenceRows.length}`);
  console.log(`public/events.csv`);
  console.log(`public/event_occurrences.csv`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
