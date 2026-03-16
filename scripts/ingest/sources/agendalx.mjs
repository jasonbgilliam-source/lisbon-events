import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://www.agendalx.pt";
const EVENTS_API = `${BASE}/wp-json/agendalx/v1/events`;
const VENUES_API = `${BASE}/wp-json/agendalx/v1/venues`;
const TAX_API = `${BASE}/wp-json/agendalx/v1/tax`;

function sha1(s) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function cleanText(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function safeMkdir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(rawBase, source, name, data) {
  const dir = path.join(rawBase, source);
  safeMkdir(dir);
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  return file;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(ms, pct = 0.3) {
  const delta = ms * pct;
  const off = (Math.random() * 2 - 1) * delta;
  return Math.max(0, Math.round(ms + off));
}

function toDateOnly(dt) {
  if (!dt) return null;
  const m = String(dt).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function absUrl(href) {
  if (!href) return null;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("/")) return BASE + href;
  return `${BASE}/${href}`;
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function safeArray(val) {
  return Array.isArray(val) ? val : [];
}

function parsePhpSerializedArrayNames(raw, idToNameMap) {
  if (!raw || typeof raw !== "string") return [];
  const ids = [...raw.matchAll(/i:(\d+);/g)].map((m) => Number(m[1])).filter(Number.isFinite);
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const name = idToNameMap.get(id);
    if (name) out.push(name);
  }
  return out;
}

function pickVenueRef(eventRow) {
  const venueObj = eventRow?.venue;
  if (!venueObj || typeof venueObj !== "object") return null;
  const entries = Object.values(venueObj);
  if (!entries.length) return null;
  const v = entries[0];
  if (!v || typeof v !== "object") return null;
  const id = Number(v.id);
  return {
    id: Number.isFinite(id) ? id : null,
    slug: v.slug || null,
    name: v.name || null,
  };
}

function extractCategoryNames(row) {
  const obj = row?.categories_name_list;
  if (!obj || typeof obj !== "object") return [];
  return Object.values(obj)
    .map((v) => cleanText(v?.name))
    .filter(Boolean);
}

function extractTagNames(row) {
  const obj = row?.tags_name_list;
  if (!obj || typeof obj !== "object") return [];
  return Object.values(obj)
    .map((v) => cleanText(v?.name))
    .filter(Boolean);
}

function normalizePrice(priceCat, priceVal, tags) {
  const cats = safeArray(priceCat).map((x) => String(x).toLowerCase());
  const tagHaystack = tags.join(" ").toLowerCase();

  if (cats.includes("free")) return "free";
  if (/\bgratuito\b|\bgrátis\b|\bgratis\b/.test(tagHaystack)) return "free";

  const val = cleanText(priceVal || "");
  return val || null;
}

function buildAudience(row) {
  const vals = safeArray(row?.target_audience)
    .map((x) => cleanText(x))
    .filter(Boolean);

  if (!vals.length) return null;
  return vals.join(", ");
}

function buildAccessibility(row) {
  const vals = safeArray(row?.accessibility)
    .map((x) => cleanText(x))
    .filter(Boolean);

  return vals;
}

function buildDescription(row) {
  const parts = safeArray(row?.description).map(cleanText).filter(Boolean);
  if (!parts.length) return null;
  return parts.join("\n\n");
}

function parseVenueRow(row, taxMaps) {
  const termId = Number(row?.term_id);
  const meta = row?.meta || {};

  const accessNames = parsePhpSerializedArrayNames(
    safeArray(meta._venue_accessibility)[0],
    taxMaps.accessibilityById
  );

  const tagNames = parsePhpSerializedArrayNames(
    safeArray(meta._venue_tag)[0],
    taxMaps.venueTagById
  );

  const venueCategorySlugs = safeArray(meta._venue_category)
    .map(cleanText)
    .filter(Boolean);

  const venueDistrictSlugs = safeArray(meta._venue_district)
    .map(cleanText)
    .filter(Boolean);

  return {
    term_id: Number.isFinite(termId) ? termId : null,
    name: cleanText(row?.name),
    slug: cleanText(row?.slug),
    address: firstNonEmpty(safeArray(meta._address)[0]),
    city: firstNonEmpty(safeArray(meta._city)[0]),
    state: firstNonEmpty(safeArray(meta._state)[0]),
    postcode: firstNonEmpty(safeArray(meta._postcode)[0]),
    country: firstNonEmpty(safeArray(meta._country)[0]),
    lat: firstNonEmpty(safeArray(meta._lat)[0]),
    lng: firstNonEmpty(safeArray(meta._lng)[0]),
    venue_web: firstNonEmpty(safeArray(meta._venue_web)[0]),
    venue_contact: firstNonEmpty(safeArray(meta._venue_contact)[0]),
    venue_extra_info: firstNonEmpty(safeArray(meta._venue_extra_info)[0]),
    venue_schedule: firstNonEmpty(safeArray(meta._venue_schedule)[0]),
    venue_category_slugs: venueCategorySlugs,
    venue_district_slugs: venueDistrictSlugs,
    venue_accessibility_names: accessNames,
    venue_tag_names: tagNames,
  };
}

async function fetchJson(fetch, url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} for ${url}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return await res.json();
}

async function fetchWithRetry(fetch, url, { headers, debug, stage }) {
  const maxAttempts = Number(process.env.AGENDALX_RETRY_ATTEMPTS || 6);
  const baseDelayMs = Number(process.env.AGENDALX_DELAY_MS || 350);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      const backoff = Math.min(30000, baseDelayMs * Math.pow(2, attempt - 2));
      await sleep(jitter(backoff, 0.4));
    }

    try {
      const res = await fetch(url, { headers });

      if (res.ok) return res;

      const status = res.status;
      debug.errors.push({ stage, url, status, attempt });

      if ([429, 500, 502, 503, 504].includes(status)) {
        const ra = res.headers?.get?.("retry-after");
        if (ra) {
          const sec = Number(ra);
          if (Number.isFinite(sec) && sec > 0) {
            await sleep(jitter(sec * 1000, 0.25));
          }
        }
        continue;
      }

      return res;
    } catch (e) {
      debug.errors.push({ stage, url, attempt, error: String(e?.message || e) });
    }
  }

  return null;
}

function buildTaxMaps(taxRows) {
  const maps = {
    accessibilityById: new Map(),
    targetAudienceById: new Map(),
    venueCategoryById: new Map(),
    venueDistrictById: new Map(),
    venueTagById: new Map(),
    freeTagById: new Map(),
    seriesById: new Map(),
  };

  for (const row of safeArray(taxRows)) {
    const id = Number(row?.term_id);
    const name = cleanText(row?.name);
    const taxonomy = cleanText(row?.taxonomy);

    if (!Number.isFinite(id) || !name || !taxonomy) continue;

    if (taxonomy === "accessibility") maps.accessibilityById.set(id, name);
    else if (taxonomy === "target_audience") maps.targetAudienceById.set(id, name);
    else if (taxonomy === "venue_category") maps.venueCategoryById.set(id, name);
    else if (taxonomy === "venue_district") maps.venueDistrictById.set(id, name);
    else if (taxonomy === "venue_tag") maps.venueTagById.set(id, name);
    else if (taxonomy === "free_tag") maps.freeTagById.set(id, name);
    else if (taxonomy === "series") maps.seriesById.set(id, name);
  }

  return maps;
}

function normalizeEvent(row, venueMap) {
  const id = Number(row?.id);
  const title = cleanText(row?.title?.rendered);
  if (!Number.isFinite(id) || !title) return null;

  const venueRef = pickVenueRef(row);
  const venue = venueRef?.id ? venueMap.get(venueRef.id) : null;

  const categories = extractCategoryNames(row);
  const tags = extractTagNames(row);

  const startDate = toDateOnly(row?.StartDate);
  const endDate = toDateOnly(row?.LastDate);

  const description = buildDescription(row);
  const audience = buildAudience(row);
  const accessibility = buildAccessibility(row);

  const addressParts = [
    venue?.address,
    venue?.postcode,
    venue?.city,
  ].map(cleanText).filter(Boolean);

  const address = addressParts.length ? addressParts.join(", ") : null;

  const city = firstNonEmpty(
    venue?.city,
    "Lisboa"
  );

  const source_id = String(id);

  return {
    title,
    starts_at: startDate,
    ends_at: endDate,
    location_name: firstNonEmpty(venueRef?.name, venue?.name),
    address,
    city,
    url: absUrl(row?.link),
    image_url: absUrl(row?.featured_media_large),
    category: categories.length ? categories.join(", ") : firstNonEmpty(row?.subject),
    audience,
    price: normalizePrice(row?.price_cat, row?.price_val, tags),
    status: "approved",
    source: "agendalx",
    source_id,
    source_url: EVENTS_API,
    dedupe_key: sha1(`agendalx:${source_id}`),

    description,
    tags,
    accessibility,
    raw_categories: categories,
    raw_target_audience: safeArray(row?.target_audience),
    raw_accessibility: safeArray(row?.accessibility),
    raw_occurrences: safeArray(row?.occurences),

    latitude: venue?.lat ? Number(venue.lat) : null,
    longitude: venue?.lng ? Number(venue.lng) : null,

    venue_url: venue?.venue_web || null,
    venue_contact: venue?.venue_contact || null,
    venue_extra_info: venue?.venue_extra_info || null,
    venue_schedule: venue?.venue_schedule || null,
    venue_category: safeArray(venue?.venue_category_slugs).join(", ") || null,
    venue_district: safeArray(venue?.venue_district_slugs).join(", ") || null,
    venue_accessibility: safeArray(venue?.venue_accessibility_names),
    venue_tags: safeArray(venue?.venue_tag_names),
  };
}

export async function scrapeAgendalx({ fetch, rawBase }) {
  const debug = {
    source: "agendalx",
    pages_fetched: 0,
    events_raw: 0,
    events_parsed: 0,
    venues_fetched: 0,
    tax_rows_fetched: 0,
    pages: [],
    errors: [],
    missing_venue_count: 0,
  };

  const headers = {
    "user-agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    accept: "application/json,text/plain,*/*",
    "accept-language": "pt-PT,pt;q=0.9,en;q=0.8",
    referer: `${BASE}/?archive=todos%20os%20eventos&s=&type=event`,
  };

  const perPage = Number(process.env.AGENDALX_PER_PAGE || 100);
  const maxPages = Number(process.env.AGENDALX_MAX_PAGES || 100);

  let venuesRaw = [];
  let taxRaw = [];

  {
    const res = await fetchWithRetry(fetch, VENUES_API, { headers, debug, stage: "venues" });
    if (!res || !res.ok) {
      throw new Error("Failed to fetch agendalx venues");
    }
    venuesRaw = await res.json();
    debug.venues_fetched = Array.isArray(venuesRaw) ? venuesRaw.length : 0;

    if (rawBase) {
      writeJson(rawBase, "agendalx", "venues.json", venuesRaw);
    }
  }

  {
    const res = await fetchWithRetry(fetch, TAX_API, { headers, debug, stage: "tax" });
    if (!res || !res.ok) {
      throw new Error("Failed to fetch agendalx tax");
    }
    taxRaw = await res.json();
    debug.tax_rows_fetched = Array.isArray(taxRaw) ? taxRaw.length : 0;

    if (rawBase) {
      writeJson(rawBase, "agendalx", "tax.json", taxRaw);
    }
  }

  const taxMaps = buildTaxMaps(taxRaw);

  const venueMap = new Map();
  for (const row of safeArray(venuesRaw)) {
    const parsed = parseVenueRow(row, taxMaps);
    if (parsed.term_id != null) venueMap.set(parsed.term_id, parsed);
  }

  const allRows = [];
  const seenIds = new Set();

  for (let page = 1; page <= maxPages; page++) {
    const url = `${EVENTS_API}?page=${page}&per_page=${perPage}`;

    const res = await fetchWithRetry(fetch, url, { headers, debug, stage: "events_page" });
    if (!res) break;
    if (!res.ok) break;

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      debug.pages.push({ page, count: 0 });
      break;
    }

    debug.pages_fetched += 1;
    debug.pages.push({ page, count: rows.length });

    if (rawBase) {
      writeJson(rawBase, "agendalx", `events_page_${page}.json`, rows);
    }

    for (const row of rows) {
      const id = Number(row?.id);
      if (!Number.isFinite(id)) continue;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      allRows.push(row);
    }

    if (rows.length < perPage) break;

    await sleep(jitter(Number(process.env.AGENDALX_PAGE_DELAY_MS || 250), 0.35));
  }

  debug.events_raw = allRows.length;

  if (rawBase) {
    writeJson(rawBase, "agendalx", "events_all.json", allRows);
  }

  const events = [];
  for (const row of allRows) {
    const ev = normalizeEvent(row, venueMap);
    if (!ev) continue;

    if (!ev.location_name) debug.missing_venue_count += 1;
    events.push(ev);
  }

  debug.events_parsed = events.length;

  return { events, debug };
}
