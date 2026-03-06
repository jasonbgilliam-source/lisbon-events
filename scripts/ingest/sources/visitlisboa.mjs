import crypto from "node:crypto";
import * as cheerio from "cheerio";
import fs from "node:fs";

const BASE = "https://www.visitlisboa.com";

function sha1(s) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function absUrl(href) {
  if (!href) return null;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  return BASE + href;
}

function cleanText(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

// Parses a date-only string like "2026-03-13" into "YYYY-MM-DD"
function toDateOnly(dt) {
  if (!dt) return null;
  const m = String(dt).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(ms, pct = 0.35) {
  const delta = ms * pct;
  const off = (Math.random() * 2 - 1) * delta;
  return Math.max(0, Math.round(ms + off));
}

function parseCard($, cardEl) {
  const $card = $(cardEl);

  const href = $card.find('a[href^="/en/events/"]').first().attr("href");
  const url = absUrl(href);

  const title = cleanText($card.find("h2 a").first().text());
  if (!url || !title) return null;

  // category label (e.g., Music, Exhibitions)
  const category = cleanText($card.find("div.font-bold").first().text()) || null;

  // time tags: can be one date or a range
  const times = $card
    .find("time")
    .toArray()
    .map((t) => $(t).attr("datetime"))
    .filter(Boolean);

  const starts_at = toDateOnly(times[0]) || null;
  const ends_at = toDateOnly(times[1]) || null;

  // image
  const img =
    $card.find("img").first().attr("src") ||
    $card.find("source").first().attr("srcset") ||
    null;

  const image_url = img ? absUrl(img) : null;

  // price badge text
  const priceCandidates = $card
    .find("span")
    .toArray()
    .map((el) => cleanText($(el).text()))
    .filter(Boolean);

  const price = priceCandidates.find((t) => /€|free entry|free/i.test(t)) || null;

  const source_id = href.replace(/^\/+/, ""); // e.g. "en/events/jethro-tull-26"

  return {
    title,
    starts_at,
    ends_at,
    location_name: null,
    address: null,
    city: "Lisbon",
    url,
    image_url,
    category: category || null,
    audience: null,
    price,
    status: "approved",
    source: "visitlisboa",
    source_id,
    source_url: BASE + "/en/events",
    dedupe_key: sha1(`visitlisboa:${source_id}`),
  };
}

function findNextPage($) {
  const href = $('a[rel="next"][href*="/en/events?page="]').attr("href");
  return href ? absUrl(href) : null;
}

function safeDetailFilename(source_id) {
  // source_id looks like "en/events/slug"
  return String(source_id || "")
    .replace(/[^\w\-\/]/g, "_")
    .replace(/\//g, "__") + ".html";
}

function extractDatesFromJsonLd($) {
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const el of scripts) {
    const raw = $(el).text();
    if (!raw) continue;
    try {
      const j = JSON.parse(raw);

      // JSON-LD can be an object or array or graph
      const candidates = [];
      if (Array.isArray(j)) candidates.push(...j);
      else candidates.push(j);

      // flatten @graph
      const flat = [];
      for (const c of candidates) {
        if (c && Array.isArray(c["@graph"])) flat.push(...c["@graph"]);
        else flat.push(c);
      }

      for (const obj of flat) {
        if (!obj || typeof obj !== "object") continue;
        const sd = obj.startDate || obj.start_date || null;
        const ed = obj.endDate || obj.end_date || null;

        const starts_at = toDateOnly(sd);
        const ends_at = toDateOnly(ed);

        if (starts_at || ends_at) return { starts_at: starts_at || null, ends_at: ends_at || null };
      }
    } catch {
      // ignore json errors
    }
  }
  return { starts_at: null, ends_at: null };
}

function extractDatesFromTimeTags($) {
  const dts = $("time[datetime]")
    .toArray()
    .map((t) => $(t).attr("datetime"))
    .filter(Boolean)
    .map(toDateOnly)
    .filter(Boolean);

  if (!dts.length) return { starts_at: null, ends_at: null };
  if (dts.length === 1) return { starts_at: dts[0], ends_at: dts[0] };
  return { starts_at: dts[0], ends_at: dts[1] || dts[0] };
}

// Optional: enrich from detail page (best effort)
function parseDetail($) {
  const bodyText = cleanText($("body").text());

  let location_name = null;
  let address = null;

  // Address label strategy
  const addrLabel = $("*:contains('Address')")
    .filter((_, el) => cleanText($(el).text()) === "Address")
    .first();
  if (addrLabel && addrLabel.length) {
    const maybe = cleanText(addrLabel.parent().text());
    const parts = maybe.split("Address").map(cleanText).filter(Boolean);
    if (parts.length) address = parts[0];
  }

  // fallback address pattern
  if (!address) {
    const m = bodyText.match(/\b(Rua|Avenida|Av\.|Praça|Largo)\b[^,]{6,140}/i);
    if (m) address = cleanText(m[0]);
  }

  // Venue label
  const venueLabel = $("*:contains('Venue')")
    .filter((_, el) => cleanText($(el).text()) === "Venue")
    .first();
  if (venueLabel && venueLabel.length) {
    const maybe = cleanText(venueLabel.parent().text());
    const parts = maybe.split("Venue").map(cleanText).filter(Boolean);
    if (parts.length) location_name = parts[0];
  }

  // Dates
  const fromLd = extractDatesFromJsonLd($);
  let starts_at = fromLd.starts_at;
  let ends_at = fromLd.ends_at;

  if (!starts_at && !ends_at) {
    const fromTime = extractDatesFromTimeTags($);
    starts_at = fromTime.starts_at;
    ends_at = fromTime.ends_at;
  }

  // last-ditch: look for ISO date in body text
  if (!starts_at) {
    const m = bodyText.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (m) starts_at = toDateOnly(m[1]);
  }
  if (!ends_at) ends_at = starts_at || null;

  return { location_name, address, starts_at, ends_at };
}

async function fetchWithRetry(fetch, url, { headers, debug, stage }) {
  // Tunables
  const maxAttempts = Number(process.env.VISITLISBOA_RETRY_ATTEMPTS || 6);
  const baseDelayMs = Number(process.env.VISITLISBOA_DELAY_MS || 450);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // throttle between attempts too
    if (attempt > 1) {
      const backoff = Math.min(120000, baseDelayMs * Math.pow(2, attempt - 2));
      await sleep(jitter(backoff, 0.4));
    } else {
      await sleep(jitter(baseDelayMs, 0.35));
    }

    let res;
    try {
      res = await fetch(url, { headers });
    } catch (e) {
      debug.errors.push({ stage, url, error: String(e?.message || e) });
      continue;
    }

    if (res.ok) return res;

    const status = res.status;

    // Retry only on rate limit / transient
    if ([429, 502, 503, 504].includes(status)) {
      let ra = res.headers?.get?.("retry-after");
      if (ra) {
        const s = Number(ra);
        if (Number.isFinite(s) && s > 0) {
          await sleep(jitter(s * 1000, 0.2));
        }
      }
      debug.errors.push({ stage, url, status });
      continue;
    }

    // Non-retriable
    debug.errors.push({ stage, url, status });
    return res;
  }

  // Give up
  return null;
}

export async function scrapeVisitLisboa({ fetch, rawBase }) {
  const debug = {
    source: "visitlisboa",
    pages_fetched: 0,
    cards_seen: 0,
    events_parsed: 0,
    detail_pages_fetched: 0,
    detail_pages_saved: 0,
    errors: [],
  };

  const events = [];
  let nextUrl = BASE + "/en/events";
  const seen = new Set();

  const listHeaders = {
    "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    accept: "text/html,application/xhtml+xml",
    "accept-language": "en-US,en;q=0.9",
    referer: BASE + "/en/events",
  };

  // Crawl listing pages (lightweight, no retries needed usually)
  while (nextUrl) {
    debug.pages_fetched += 1;

    const res = await fetch(nextUrl, { headers: listHeaders });

    if (!res.ok) {
      debug.errors.push({ stage: "list", url: nextUrl, status: res.status });
      break;
    }

    const html = await res.text();

    // Save raw listing page
    if (rawBase) {
      const safeName = nextUrl.replace(BASE, "").replace(/[^\w\-\/\?=&]/g, "_");
      const fileName =
        safeName === "" || safeName === "/"
          ? "events_page_1.html"
          : `events${safeName.replace(/\//g, "_")}.html`;
      const dir = `${rawBase}/visitlisboa`;
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(`${dir}/${fileName}`, html);
    }

    const $ = cheerio.load(html);

    const cards = $('div[data-controller="clickable-card"]').toArray();
    debug.cards_seen += cards.length;

    for (const card of cards) {
      const item = parseCard($, card);
      if (!item) continue;
      if (seen.has(item.dedupe_key)) continue;
      seen.add(item.dedupe_key);
      events.push(item);
    }

    debug.events_parsed = events.length;

    const candidateNext = findNextPage($);
    if (!candidateNext) break;
    if (debug.pages_fetched >= 25) break; // safety cap
    nextUrl = candidateNext;
  }

  // Enrichment:
  // - only for events missing starts_at OR missing address/location_name
  // - throttled + retried (429-safe)
  const ENRICH_LIMIT = Number(process.env.VISITLISBOA_ENRICH_LIMIT || 60);

  const needsEnrich = events.filter((e) => {
    return !e.starts_at || !e.location_name || !e.address;
  });

  for (let i = 0; i < needsEnrich.length && i < ENRICH_LIMIT; i++) {
    const ev = needsEnrich[i];

    const res = await fetchWithRetry(fetch, ev.url, {
      headers: listHeaders,
      debug,
      stage: "detail",
    });

    if (!res) continue;
    if (!res.ok) continue;

    const html = await res.text();
    debug.detail_pages_fetched += 1;

    // Save raw detail page
    if (rawBase) {
      const dir = `${rawBase}/visitlisboa/details`;
      fs.mkdirSync(dir, { recursive: true });
      const fileName = safeDetailFilename(ev.source_id);
      fs.writeFileSync(`${dir}/${fileName}`, html);
      debug.detail_pages_saved += 1;
    }

    const $ = cheerio.load(html);
    const detail = parseDetail($);

    if (detail.location_name) ev.location_name = detail.location_name;
    if (detail.address) ev.address = detail.address;

    // Fill missing dates from detail (do NOT overwrite existing)
    if (!ev.starts_at && detail.starts_at) ev.starts_at = detail.starts_at;
    if (!ev.ends_at && detail.ends_at) ev.ends_at = detail.ends_at;
  }

  return { events, debug };
}