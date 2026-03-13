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
  // Only accept single-slug pages like:
  // https://lisboasecreta.co/en/something-like-this/
  // Avoid: /category/, /tag/, /profile/, /about-us/, /food-drink/, etc.
  try {
    const u = new URL(url);
    if (u.hostname !== "lisboasecreta.co") return false;
    if (!u.pathname.startsWith("/en/")) return false;

    const p = u.pathname.replace(/\/+$/, ""); // trim trailing /
    if (p === "/en") return false;

    // Exclusions
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

    // Must be exactly /en/<slug>
    const parts = p.split("/").filter(Boolean);
    if (parts.length !== 2) return false;

    const slug = parts[1];

    // Heuristic: real articles almost always have hyphens
    if (!slug.includes("-")) return false;

    // Avoid weird asset URLs
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

export async function scrapeLisboaSecreta({ fetch, rawBase }) {
  const source = "lisboa_secreta";
  const debug = {
    list_pages: [],
    event_pages: [],
    warnings: [],
    picked_links: 0,
    skipped_non_article_links: 0,
    extracted_ldjson_events: 0,
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

      const slug = url.replace("https://lisboasecreta.co/en/", "").replace(/\/$/, "");
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

      // Optional JSON-LD Event (rare here, but safe)
      let parsed = null;
      const ldBlocks = extractLdJson($$);
      for (const block of ldBlocks) {
        const eventNode = findEventNode(block);
        if (eventNode) {
          parsed = parseEventFromLd(eventNode);
          debug.extracted_ldjson_events += 1;
          break;
        }
      }

      events.push({
        source,
        source_url: url,
        source_id: slug,

        title: parsed?.title || metaTitle,
        description: parsed?.description || metaDescription || "",
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
        city: "",

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