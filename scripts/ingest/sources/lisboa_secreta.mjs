import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

function safeMkdir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeRaw(rawBase, source, name, html) {
  const dir = path.join(rawBase, source);
  safeMkdir(dir);
  const file = path.join(dir, name);
  fs.writeFileSync(file, html, "utf8");
  return file;
}

function pickFirstNonEmpty(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function safeFileName(s) {
  return String(s || "")
    .trim()
    .slice(0, 140)
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_");
}

function isLikelyArticleUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== "lisboasecreta.co") return false;
    if (!u.pathname.startsWith("/en/")) return false;

    const p = u.pathname.replace(/\/+$/, "");
    if (p === "/en") return false;

    const badPrefixes = [
      "/en/category/",
      "/en/tag/",
      "/en/profile",
      "/en/about",
      "/en/contact",
      "/en/terms",
      "/en/privacy",
      "/en/cookies",
      "/en/food-drink",
      "/en/culture",
      "/en/escapes",
      "/en/wellness-nature",
      "/en/things-to-do",
      "/en/top-news",
    ];
    if (badPrefixes.some((bp) => p.startsWith(bp))) return false;

    const parts = p.split("/").filter(Boolean);
    if (parts.length !== 2) return false;

    const slug = parts[1];
    if (!slug.includes("-")) return false;
    if (slug.includes(".")) return false;

    return true;
  } catch {
    return false;
  }
}

function extractLdJson($) {
  const out = [];
  $("script[type='application/ld+json']").each((_, el) => {
    const raw = $(el).text();
    if (!raw || !raw.trim()) return;
    try {
      out.push(JSON.parse(raw));
    } catch {
      try {
        const cleaned = raw.trim();
        if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
          out.push(JSON.parse(cleaned));
        }
      } catch {}
    }
  });
  return out;
}

function flattenLdNodes(node) {
  const nodes = [];
  const walk = (n) => {
    if (!n) return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (typeof n !== "object") return;
    nodes.push(n);
    if (n["@graph"]) walk(n["@graph"]);
  };
  walk(node);
  return nodes;
}

function findEventNode(ld) {
  const all = flattenLdNodes(ld);
  for (const n of all) {
    const t = n["@type"];
    const types = Array.isArray(t) ? t : t ? [t] : [];
    const normalized = types.map((x) => String(x).toLowerCase());
    if (normalized.includes("event") || normalized.some((x) => x.endsWith("event"))) return n;
  }
  return null;
}

function parseEventFromLd(node) {
  const title = typeof node.name === "string" ? node.name : "";
  const description = typeof node.description === "string" ? node.description : "";

  const image_url =
    typeof node.image === "string"
      ? node.image
      : Array.isArray(node.image) && typeof node.image[0] === "string"
      ? node.image[0]
      : "";

  const starts_at = typeof node.startDate === "string" ? node.startDate : "";
  const ends_at = typeof node.endDate === "string" ? node.endDate : "";

  let location_name = "";
  let address = "";

  const loc = node.location;
  if (typeof loc === "string") {
    location_name = loc;
  } else if (loc && typeof loc === "object") {
    location_name = typeof loc.name === "string" ? loc.name : "";
    const addr = loc.address;
    if (typeof addr === "string") {
      address = addr;
    } else if (addr && typeof addr === "object") {
      const parts = [
        addr.streetAddress,
        addr.addressLocality,
        addr.postalCode,
        addr.addressCountry,
      ].filter(Boolean);
      address = parts.join(", ");
    }
  }

  return { title, description, image_url, starts_at, ends_at, location_name, address };
}

function cleanText(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function bodyText($) {
  return cleanText($("article").text() || $("main").text() || $("body").text());
}

function slugFromUrl(url) {
  return url.replace("https://lisboasecreta.co/en/", "").replace(/\/$/, "");
}

function looksLikeEventSlug(slug) {
  const s = String(slug || "").toLowerCase();

  const positive = [
    "concert",
    "festival",
    "party",
    "market",
    "fair",
    "show",
    "musical",
    "opera",
    "theatre",
    "theater",
    "cinema",
    "movie",
    "film",
    "exhibition",
    "exhibit",
    "museum",
    "event",
    "events",
    "live",
    "performance",
    "parade",
    "tour",
    "talk",
    "talks",
    "conference",
    "workshop",
    "week",
    "weekend",
    "anniversary",
  ];

  const negative = [
    "guide",
    "best-of",
    "best-",
    "top-",
    "what-to-do",
    "visit-lisbon",
    "secret-guides",
    "change-to-daylight-saving-time",
    "official-portrait",
    "report",
    "city",
    "restaurant",
    "restaurants",
    "metro",
    "subway",
    "bridge",
    "monument",
    "history-",
    "historic-",
    "funicular",
    "traffic",
    "transport",
    "airport",
    "booked-restaurant",
    "destinations",
    "ranking",
    "news",
    "supermarket",
  ];

  let score = 0;
  for (const token of positive) {
    if (s.includes(token)) score += 2;
  }
  for (const token of negative) {
    if (s.includes(token)) score -= 3;
  }

  return score > 0;
}

function scoreEventLikelihood({ url, title, description, text, hasLdEvent }) {
  const slug = slugFromUrl(url).toLowerCase();
  const haystack = [title, description, text].map((x) => String(x || "").toLowerCase()).join(" ");

  let score = 0;
  const reasons = [];

  if (hasLdEvent) {
    score += 8;
    reasons.push("jsonld-event");
  }

  if (looksLikeEventSlug(slug)) {
    score += 3;
    reasons.push("event-like-slug");
  }

  const positivePatterns = [
    /\bconcert\b/,
    /\bfestival\b/,
    /\bmarket\b/,
    /\bfair\b/,
    /\bexhibition\b/,
    /\bmusical\b/,
    /\bparty\b/,
    /\bshow\b/,
    /\blive music\b/,
    /\bperformance\b/,
    /\bparade\b/,
    /\bworkshop\b/,
    /\btalks?\b/,
    /\btickets?\b/,
    /\brsvp\b/,
    /\bfree entry\b/,
    /\bvenue\b/,
    /\bopening hours\b/,
    /\bbook now\b/,
    /\bstarts?\b/,
    /\bfrom \d{1,2}(am|pm)\b/,
    /\bon [a-z]+, [a-z]+ \d{1,2}\b/,
    /\bthis weekend\b/,
  ];

  const negativePatterns = [
    /\bguide to\b/,
    /\bbest of\b/,
    /\bbest places\b/,
    /\bwhat to do in lisbon\b/,
    /\bmost booked\b/,
    /\breport\b/,
    /\branking\b/,
    /\baccording to\b/,
    /\bwill change\b/,
    /\bhas been unveiled\b/,
    /\bnews\b/,
    /\brestaurant\b/,
    /\brestaurants\b/,
    /\bmetro\b/,
    /\bsubway\b/,
    /\bfunicular\b/,
    /\bbridge\b/,
    /\bcity\b/,
    /\bdestination\b/,
    /\btop 15\b/,
    /\btop 50\b/,
    /\btop 100\b/,
  ];

  for (const rx of positivePatterns) {
    if (rx.test(haystack)) score += 1;
  }

  for (const rx of negativePatterns) {
    if (rx.test(haystack)) score -= 2;
  }

  if (/€|\beuros?\b|\bfree\b/i.test(haystack)) {
    score += 1;
    reasons.push("price-like-language");
  }

  if (/\b(lisbon|marvila|belem|alfama|chiado|bairro alto|cais do sodre)\b/i.test(haystack)) {
    score += 1;
    reasons.push("place-language");
  }

  return { score, reasons };
}

function shouldKeepCandidate(candidate) {
  const { score } = scoreEventLikelihood(candidate);

  if (candidate.hasLdEvent) return true;
  if (candidate.parsed?.starts_at || candidate.parsed?.location_name || candidate.parsed?.address) {
    return score >= 1;
  }

  return score >= 3;
}

export async function scrapeLisboaSecreta({ fetch, rawBase }) {
  const source = "lisboa_secreta";
  const debug = {
    list_pages: [],
    event_pages: [],
    warnings: [],
    picked_links: 0,
    skipped_non_article_links: 0,
    extracted_ldjson_events: 0,
    rejected_non_events: [],
    kept_without_ldjson: [],
  };

  const startUrl = "https://lisboasecreta.co/en/";
  debug.list_pages.push(startUrl);

  const res = await fetch(startUrl, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; LisbonEventsBot/1.0)" },
  });

  const html = await res.text();
  writeRaw(rawBase, source, "start.html", html);

  const $ = cheerio.load(html);
  const links = new Set();

  $("a[href]").each((_, a) => {
    const href = $(a).attr("href");
    if (!href) return;
    if (!href.startsWith("http")) return;

    if (!isLikelyArticleUrl(href)) {
      debug.skipped_non_article_links += 1;
      return;
    }

    links.add(href.split("#")[0]);
  });

  const candidates = [...links].slice(0, 50);
  debug.picked_links = candidates.length;

  const events = [];

  for (const url of candidates) {
    try {
      const r = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; LisbonEventsBot/1.0)" },
      });

      const pageHtml = await r.text();
      debug.event_pages.push(url);

      const slug = slugFromUrl(url);
      const rawPath = writeRaw(rawBase, source, `${safeFileName(slug) || "page"}.html`, pageHtml);

      const $$ = cheerio.load(pageHtml);

      const metaTitle = pickFirstNonEmpty(
        $$("meta[property='og:title']").attr("content"),
        $$("h1").first().text()
      );

      if (!metaTitle) continue;

      const metaImage = pickFirstNonEmpty(
        $$("meta[property='og:image']").attr("content"),
        $$("img").first().attr("src")
      );

      const metaDescription = pickFirstNonEmpty(
        $$("meta[property='og:description']").attr("content"),
        $$("meta[name='description']").attr("content")
      );

      let parsed = null;
      let hasLdEvent = false;

      const ldBlocks = extractLdJson($$);
      for (const block of ldBlocks) {
        const eventNode = findEventNode(block);
        if (eventNode) {
          parsed = parseEventFromLd(eventNode);
          hasLdEvent = true;
          debug.extracted_ldjson_events += 1;
          break;
        }
      }

      const text = bodyText($$);

      const candidate = {
        url,
        title: parsed?.title || metaTitle,
        description: parsed?.description || metaDescription || "",
        text,
        parsed,
        hasLdEvent,
      };

      if (!shouldKeepCandidate(candidate)) {
        debug.rejected_non_events.push({
          url,
          title: candidate.title,
          score: scoreEventLikelihood(candidate).score,
        });
        continue;
      }

      if (!hasLdEvent) {
        debug.kept_without_ldjson.push({
          url,
          title: candidate.title,
          score: scoreEventLikelihood(candidate).score,
        });
      }

      events.push({
        source,
        source_url: url,
        source_id: slug,

        title: candidate.title,
        description: candidate.description,
        image_url: parsed?.image_url || metaImage || "",

        occurrences: [
          {
            starts_at: parsed?.starts_at || "",
            ends_at: parsed?.ends_at || "",
            date_text: "",
          },
        ],

        location_name: parsed?.location_name || "",
        address: parsed?.address || "",
        city: "Lisbon",

        category: "",
        audience: [],
        price: "",

        source_evidence_path: rawPath,
      });
    } catch (err) {
      debug.warnings.push({ url, error: String(err) });
    }
  }

  return { events, debug };
}
