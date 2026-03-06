import fs from "node:fs";
import crypto from "node:crypto";
import { getJson } from "serpapi";

const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

// Tunables
const MAX_SERP_RESULTS = Number(process.env.SERP_MAX_RESULTS || 8);
const FETCH_TIMEOUT_MS = Number(process.env.ENRICH_FETCH_TIMEOUT_MS || 15000);
const USER_AGENT =
  process.env.ENRICH_UA ||
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36";

if (!SERPAPI_API_KEY) {
  console.error("Missing SERPAPI_API_KEY");
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

function sha1(s) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickCandidateUrls(serpJson) {
  const urls = [];

  // Organic results
  const organic = serpJson?.organic_results || [];
  for (const r of organic) {
    if (r?.link) urls.push(r.link);
  }

  // Sometimes "top_stories" or other blocks contain relevant links
  const inline = serpJson?.inline_videos || [];
  for (const r of inline) if (r?.link) urls.push(r.link);

  // Dedup while keeping order
  const seen = new Set();
  const out = [];
  for (const u of urls) {
    if (!u) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function scoreUrl(u) {
  const s = String(u || "").toLowerCase();

  // Prefer official-ish / ticket sources (tune to your needs)
  const boosts = [
    ["feverup.com", 60],
    ["eventbrite.", 55],
    ["visitlisboa.com", 45],
    ["ticketline.", 40],
    ["bol.pt", 40],
    ["seetickets", 35],
    ["meoarena", 35],
    ["coliseulisboa", 35],
    ["timeout", 25],
    ["facebook.com/events", 20],
    ["instagram.com", -10],
    ["tiktok.com", -50],
  ];

  let score = 0;
  for (const [needle, val] of boosts) {
    if (s.includes(needle)) score += val;
  }

  // Prefer shorter URLs (often canonical pages)
  score += Math.max(0, 15 - Math.min(15, s.length / 30));

  return score;
}

function sortBestUrls(urls) {
  return [...urls]
    .map((u) => ({ u, score: scoreUrl(u) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.u);
}

async function serpSearch({ q }) {
  return await new Promise((resolve, reject) => {
    getJson(
      {
        engine: "google",
        q,
        api_key: SERPAPI_API_KEY,
        google_domain: "google.com",
        hl: "en",
        gl: "pt",
        num: MAX_SERP_RESULTS,
      },
      (json) => resolve(json)
    );
  });
}

async function fetchText(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
      redirect: "follow",
      signal: ac.signal,
    });
    const ct = res.headers.get("content-type") || "";
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      contentType: ct,
      text,
      finalUrl: res.url,
    };
  } catch (e) {
    return { ok: false, status: 0, contentType: "", text: "", finalUrl: url, error: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

function clipHtml(html, maxChars = 120000) {
  if (!html) return "";
  // Keep it simple: trim to size. (We can later improve by stripping scripts/styles.)
  return html.length > maxChars ? html.slice(0, maxChars) : html;
}

async function openaiExtract({ queryTitle, queryCity, hints, pageUrl, pageHtml }) {
  const system = `You extract structured event data for a Lisbon events database.
Return STRICT JSON only. Do not include markdown or commentary.

Rules:
- If unknown, use null (not empty string).
- Prefer the most official event/ticket/venue page.
- Extract best-available dates. If only a date range exists, return start_date and end_date.
- Image URLs: prefer og:image or primary promo image. Return up to 5.
- Currency should be as seen on page (e.g., €).
- If times are present, include them (local time). If not present, leave time null.
- Return canonical_url if page indicates a canonical link or the best ticket/official link.
`;

  const user = {
    query: {
      title: queryTitle,
      city: queryCity || "Lisbon",
      hints: hints || null,
    },
    page: {
      url: pageUrl,
      html: clipHtml(pageHtml),
    },
    output_schema: {
      title: "string|null",
      venue_name: "string|null",
      address: "string|null",
      city: "string|null",
      start_date: "YYYY-MM-DD|null",
      start_time: "HH:MM|null",
      end_date: "YYYY-MM-DD|null",
      end_time: "HH:MM|null",
      price: "string|null",
      currency: "string|null",
      images: "string[] (0..5)",
      canonical_url: "string|null",
      ticket_url: "string|null",
      source_notes: "string|null"
    }
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${txt.slice(0, 300)}`);
  }

  const j = await res.json();
  const content = j?.choices?.[0]?.message?.content || "";
  // Parse strict JSON
  return JSON.parse(content);
}

export async function enrichOne({ title, city = "Lisbon", hints = null }) {
  const q = `${title} ${city} tickets venue`;
  const serp = await serpSearch({ q });

  const urls = sortBestUrls(pickCandidateUrls(serp)).slice(0, 6);

  const debug = {
    q,
    serp_top_urls: urls,
    tried: [],
  };

  for (const url of urls) {
    const fetched = await fetchText(url);
    debug.tried.push({
      url,
      ok: fetched.ok,
      status: fetched.status,
      finalUrl: fetched.finalUrl,
      contentType: fetched.contentType,
      error: fetched.error || null,
      bytes: fetched.text ? fetched.text.length : 0,
    });

    if (!fetched.ok) continue;
    if (!/text\/html/i.test(fetched.contentType) && fetched.text.length < 2000) continue;

    try {
      const extracted = await openaiExtract({
        queryTitle: title,
        queryCity: city,
        hints,
        pageUrl: fetched.finalUrl,
        pageHtml: fetched.text,
      });

      return {
        ok: true,
        query: { title, city, hints },
        chosen_url: fetched.finalUrl,
        extracted,
        debug,
        dedupe_key: sha1(`serpapi:${title}:${city}:${fetched.finalUrl}`),
      };
    } catch (e) {
      debug.tried[debug.tried.length - 1].extract_error = String(e?.message || e);
      continue;
    }
  }

  return { ok: false, query: { title, city, hints }, extracted: null, debug };
}

// CLI usage:
// node scripts/ingest/enrich/serpapi_openai_enrich.mjs "Horizon of Cheops" "Lisbon"
if (import.meta.url === `file://${process.argv[1]}`) {
  const title = process.argv.slice(2).join(" ").trim();
  if (!title) {
    console.error('Usage: node scripts/ingest/enrich/serpapi_openai_enrich.mjs "Event title"');
    process.exit(1);
  }
  const out = await enrichOne({ title, city: "Lisbon" });
  console.log(JSON.stringify(out, null, 2));
}
