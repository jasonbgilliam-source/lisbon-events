import crypto from "node:crypto";
import { getJson } from "serpapi";

const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

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
  return crypto.createHash("sha1").update(String(s || "")).digest("hex");
}

function normalizeText(v) {
  return String(v || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(v) {
  return new Set(
    normalizeText(v)
      .split(" ")
      .filter((x) => x && x.length >= 3)
  );
}

function overlapScore(a, b) {
  const sa = tokenize(a);
  const sb = tokenize(b);
  if (!sa.size || !sb.size) return 0;

  let overlap = 0;
  for (const t of sa) {
    if (sb.has(t)) overlap += 1;
  }

  return overlap / Math.max(1, Math.min(sa.size, sb.size));
}

function containsAllImportantTokens(queryTitle, candidateText) {
  const q = [...tokenize(queryTitle)].filter(
    (t) =>
      ![
        "lisbon",
        "lisboa",
        "event",
        "show",
        "festival",
        "market",
        "fair",
        "the",
        "and",
      ].includes(t)
  );

  if (!q.length) return false;

  const cand = tokenize(candidateText);
  const matched = q.filter((t) => cand.has(t)).length;
  return matched >= Math.max(1, Math.ceil(q.length * 0.6));
}

function safeUrl(raw) {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function pickCandidateResults(serpJson) {
  const out = [];
  const seen = new Set();

  const organic = serpJson?.organic_results || [];
  for (const r of organic) {
    const link = r?.link;
    if (!link || seen.has(link)) continue;
    seen.add(link);
    out.push({
      url: link,
      result_title: r?.title || "",
      snippet: r?.snippet || r?.snippet_highlighted_words?.join(" ") || "",
      source: "organic",
    });
  }

  const inline = serpJson?.inline_videos || [];
  for (const r of inline) {
    const link = r?.link;
    if (!link || seen.has(link)) continue;
    seen.add(link);
    out.push({
      url: link,
      result_title: r?.title || "",
      snippet: r?.snippet || "",
      source: "inline",
    });
  }

  return out;
}

function scoreResult(result, queryTitle) {
  const parsed = safeUrl(result.url);
  const urlStr = String(result.url || "").toLowerCase();
  const host = parsed?.hostname?.toLowerCase() || "";
  const path = parsed?.pathname?.toLowerCase() || "";
  const query = parsed?.search?.toLowerCase() || "";
  const resultTitle = result.result_title || "";
  const snippet = result.snippet || "";

  let score = 0;

  const hostBoosts = [
    ["feverup.com", 70],
    ["eventbrite.", 68],
    ["ticketline.", 64],
    ["bol.pt", 62],
    ["seetickets", 58],
    ["shotgun.live", 55],
    ["dice.fm", 55],
    ["songkick.com", 45],
    ["bandsintown.com", 42],
    ["agendalx.pt", 38],
    ["visitlisboa.com", 28],
    ["timeout.pt", 8],
    ["facebook.com", 5],
    ["instagram.com", -20],
    ["tiktok.com", -60],
    ["wikipedia.org", -80],
    ["tripadvisor.", -50],
    ["booking.com", -50],
    ["airbnb.", -50],
    ["giift.com", -70],
    ["oladaniela.com", -70],
    ["3cket.com", -18],
  ];

  for (const [needle, val] of hostBoosts) {
    if (host.includes(needle)) score += val;
  }

  const positivePathPatterns = [
    [/\/events\/[^/?#]+/i, 35],
    [/\/event\/[^/?#]+/i, 35],
    [/\/agenda\/[^/?#]+/i, 28],
    [/\/festival/i, 24],
    [/\/concert/i, 24],
    [/\/show/i, 20],
    [/\/exhibition/i, 20],
    [/\/bilhetes?/i, 22],
    [/\/tickets?/i, 22],
    [/\/fever-originals/i, 20],
  ];

  const negativePathPatterns = [
    [/\/en\/?$/i, -45],
    [/\/pt\/?$/i, -45],
    [/^\/events\/?$/i, -45],
    [/^\/event\/?$/i, -45],
    [/\/places\//i, -40],
    [/\/blog\//i, -25],
    [/\/category\//i, -30],
    [/\/tag\//i, -30],
    [/\/author\//i, -30],
    [/\/news\//i, -22],
    [/\/guides?\//i, -28],
    [/\/restaurants?/i, -26],
    [/\/destinations?/i, -26],
    [/\/best-/i, -22],
    [/\/whats-on\/?$/i, -30],
    [/\/p\/whats-on/i, -30],
    [/\/walking-tour/i, -35],
    [/\/tour\//i, -20],
  ];

  for (const [re, val] of positivePathPatterns) {
    if (re.test(path)) score += val;
  }

  for (const [re, val] of negativePathPatterns) {
    if (re.test(path)) score += val;
  }

  if (query) {
    if (/q%5b|categories_id_in|search=|filter=|utm_/i.test(query)) {
      score -= 20;
    }
  }

  const negativeTextPatterns = [
    [/\bguide\b/i, -22],
    [/\bsecret guide\b/i, -26],
    [/\bwhat to do\b/i, -24],
    [/\bthings to do\b/i, -24],
    [/\bbest\b/i, -16],
    [/\blandmarks\b/i, -20],
    [/\battractions\b/i, -20],
    [/\brestaurants?\b/i, -18],
    [/\bhidden corners\b/i, -20],
    [/\bitinerary\b/i, -20],
    [/\bbackpack\b/i, -20],
    [/\bmetro\b/i, -14],
    [/\bvisit lisbon\b/i, -18],
    [/\bwalking tour\b/i, -32],
    [/\bfood tour\b/i, -32],
  ];

  for (const [re, val] of negativeTextPatterns) {
    if (re.test(urlStr) || re.test(resultTitle) || re.test(snippet)) score += val;
  }

  const titleOverlap = overlapScore(queryTitle, resultTitle);
  const snippetOverlap = overlapScore(queryTitle, snippet);
  const combinedText = `${resultTitle} ${snippet} ${path}`;

  score += Math.round(titleOverlap * 60);
  score += Math.round(snippetOverlap * 25);

  if (containsAllImportantTokens(queryTitle, combinedText)) {
    score += 18;
  }

  if (!containsAllImportantTokens(queryTitle, combinedText) && titleOverlap < 0.34) {
    score -= 24;
  }

  if (path === "/" || path === "") score -= 40;

  return {
    ...result,
    score,
    title_overlap: Number(titleOverlap.toFixed(3)),
    snippet_overlap: Number(snippetOverlap.toFixed(3)),
  };
}

async function serpSearch({ q }) {
  return await new Promise((resolve) => {
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
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,*/*",
      },
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
    return {
      ok: false,
      status: 0,
      contentType: "",
      text: "",
      finalUrl: url,
      error: String(e?.message || e),
    };
  } finally {
    clearTimeout(t);
  }
}

function clipHtml(html, maxChars = 120000) {
  if (!html) return "";
  return html.length > maxChars ? html.slice(0, maxChars) : html;
}

async function openaiExtract({ queryTitle, queryCity, hints, pageUrl, pageHtml }) {
  const system = `You extract structured event data for a Lisbon events database.
Return STRICT JSON only. Do not include markdown or commentary.

Rules:
- If the page is not about a specific real-world event matching the query, return all unknown fields as null and set source_notes to a brief reason such as "non-event page", "listing page", "place page", "query mismatch", or "guide/listicle page".
- If unknown, use null.
- Extract best-available dates.
- Prefer official or ticket pages.
- Images: return up to 5 likely promo image URLs if visible in HTML.
- Do not invent venue names, dates, times, prices, or URLs.
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
      images: "string[]",
      canonical_url: "string|null",
      ticket_url: "string|null",
      source_notes: "string|null",
    },
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
    throw new Error(`OpenAI error ${res.status}: ${txt.slice(0, 400)}`);
  }

  const j = await res.json();
  const content = j?.choices?.[0]?.message?.content || "";
  return JSON.parse(content);
}

function isClearlyBadTarget(finalUrl) {
  const parsed = safeUrl(finalUrl);
  const host = parsed?.hostname?.toLowerCase() || "";
  const path = parsed?.pathname?.toLowerCase() || "";
  const query = parsed?.search?.toLowerCase() || "";

  if (!parsed) return true;
  if (path === "/" || path === "") return true;
  if (/\/places\//i.test(path)) return true;
  if (/^\/events\/?$/i.test(path)) return true;
  if (/^\/event\/?$/i.test(path)) return true;
  if (/\/en\/?$/i.test(path) || /\/pt\/?$/i.test(path)) return true;
  if (/q%5b|categories_id_in|search=|filter=|utm_/i.test(query)) return true;
  if (/(giift\.com|oladaniela\.com|wikipedia\.org)/i.test(host)) return true;
  if (/\/walking-tour/i.test(path)) return true;

  return false;
}

function extractedLooksUsable(queryTitle, extracted) {
  if (!extracted || typeof extracted !== "object") return false;

  const exTitle = extracted.title || "";
  const overlap = overlapScore(queryTitle, exTitle);

  const hasEventFields =
    Boolean(extracted.start_date) ||
    Boolean(extracted.venue_name) ||
    Boolean(extracted.ticket_url) ||
    Boolean(extracted.address);

  const sourceNotes = String(extracted.source_notes || "").toLowerCase();
  const notesSayBad =
    /non-event|listing page|place page|query mismatch|guide\/listicle|guide|listicle/.test(
      sourceNotes
    );

  if (notesSayBad) return false;
  if (!hasEventFields) return false;
  if (exTitle && overlap < 0.34) return false;

  return true;
}

export async function enrichOne({ title, city = "Lisbon", hints = null }) {
  const q = `${title} ${city} tickets venue`;

  const serp = await serpSearch({ q });
  const ranked = pickCandidateResults(serp)
    .map((r) => scoreResult(r, title))
    .sort((a, b) => b.score - a.score);

  const debug = {
    q,
    serp_top_urls: ranked.slice(0, 10),
    tried: [],
  };

  for (const item of ranked.slice(0, 8)) {
    const fetched = await fetchText(item.url);

    debug.tried.push({
      url: item.url,
      result_title: item.result_title,
      snippet: item.snippet,
      score: item.score,
      title_overlap: item.title_overlap,
      snippet_overlap: item.snippet_overlap,
      ok: fetched.ok,
      status: fetched.status,
      finalUrl: fetched.finalUrl,
      contentType: fetched.contentType,
      error: fetched.error || null,
      bytes: fetched.text ? fetched.text.length : 0,
    });

    if (!fetched.ok) continue;
    if (!/text\/html/i.test(fetched.contentType) && fetched.text.length < 2000) continue;
    if (isClearlyBadTarget(fetched.finalUrl)) {
      debug.tried[debug.tried.length - 1].skipped_reason = "clearly_bad_target";
      continue;
    }

    try {
      const extracted = await openaiExtract({
        queryTitle: title,
        queryCity: city,
        hints,
        pageUrl: fetched.finalUrl,
        pageHtml: fetched.text,
      });

      if (!extractedLooksUsable(title, extracted)) {
        debug.tried[debug.tried.length - 1].skipped_reason = "extraction_not_usable";
        debug.tried[debug.tried.length - 1].extracted_title = extracted?.title || null;
        debug.tried[debug.tried.length - 1].source_notes = extracted?.source_notes || null;
        continue;
      }

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
    }
  }

  return {
    ok: false,
    query: { title, city, hints },
    extracted: null,
    debug,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const title = process.argv.slice(2).join(" ").trim();

  if (!title) {
    console.error('Usage: node scripts/ingest/enrich/serpapi_openai_enrich.mjs "Event title"');
    process.exit(1);
  }

  const out = await enrichOne({ title, city: "Lisbon" });
  console.log(JSON.stringify(out, null, 2));
}
