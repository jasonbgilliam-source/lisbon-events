import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in environment.");
  process.exit(1);
}

const MIN_CONFIDENCE = Number(process.env.AI_EVENT_MIN_CONFIDENCE || 0.85);

const ALLOWED_CATEGORIES = new Set([
  "concert",
  "festival",
  "exhibition",
  "guided visit",
  "market",
  "fair",
  "theater",
  "theatre",
  "screening",
  "workshop",
  "talk",
  "parade",
  "opera",
  "musical",
  "performance",
  "tour",
]);

const BLOCKLIST_PATTERNS = [
  /official portrait/i,
  /\bpresident\b/i,
  /\bunveiled\b/i,
  /permanent display/i,
  /now on display/i,
  /store closing/i,
  /discount sale/i,
  /daylight saving/i,
  /\bguide\b/i,
  /\btop 10\b/i,
  /\btop 15\b/i,
  /\btop 50\b/i,
  /\btop 100\b/i,
];

function latestDir(base) {
  const items = fs.existsSync(base) ? fs.readdirSync(base).sort() : [];
  if (!items.length) {
    throw new Error(`No directories found in ${base}`);
  }
  return items[items.length - 1];
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function safeMkdir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function slugFromUrl(url) {
  return String(url || "")
    .replace("https://lisboasecreta.co/en/", "")
    .replace(/\/$/, "");
}

function safeFileName(s) {
  return String(s || "")
    .trim()
    .slice(0, 140)
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_");
}

function cleanText(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function extractPageSignals(html, url) {
  const $ = cheerio.load(html);

  const title =
    cleanText($("meta[property='og:title']").attr("content")) ||
    cleanText($("h1").first().text());

  const description =
    cleanText($("meta[property='og:description']").attr("content")) ||
    cleanText($("meta[name='description']").attr("content"));

  const articleText = cleanText($("article").text());
  const mainText = cleanText($("main").text());
  const bodyText = cleanText($("body").text());

  const text = articleText || mainText || bodyText;

  return {
    url,
    slug: slugFromUrl(url),
    title,
    description,
    text: text.slice(0, 8000),
  };
}

function normalizeCategory(value) {
  return String(value || "").trim().toLowerCase();
}

function shouldApproveRescue(review, candidate) {
  if (!review?.is_event) return { ok: false, reason: "is_event=false" };

  const confidence = Number(review.confidence || 0);
  if (!Number.isFinite(confidence) || confidence < MIN_CONFIDENCE) {
    return { ok: false, reason: `confidence<${MIN_CONFIDENCE}` };
  }

  const category = normalizeCategory(review.category);
  if (!ALLOWED_CATEGORIES.has(category)) {
    return { ok: false, reason: `category_not_allowed:${category || "blank"}` };
  }

  const haystack = [
    candidate?.title || "",
    candidate?.description || "",
    review?.title || "",
    review?.reason || "",
    review?.summary || "",
  ].join(" ");

  for (const rx of BLOCKLIST_PATTERNS) {
    if (rx.test(haystack)) {
      return { ok: false, reason: `blocked_by_pattern:${rx}` };
    }
  }

  return { ok: true, reason: "approved" };
}

async function reviewCandidate(candidate) {
  const schema = {
    name: "lisbon_event_review",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        is_event: { type: "boolean" },
        confidence: { type: "number" },
        reason: { type: "string" },
        title: { type: "string" },
        starts_at: { type: ["string", "null"] },
        ends_at: { type: ["string", "null"] },
        location_name: { type: ["string", "null"] },
        address: { type: ["string", "null"] },
        city: { type: ["string", "null"] },
        category: { type: ["string", "null"] },
        price: { type: ["string", "null"] },
        audience: {
          type: "array",
          items: { type: "string" },
        },
        summary: { type: "string" },
      },
      required: [
        "is_event",
        "confidence",
        "reason",
        "title",
        "starts_at",
        "ends_at",
        "location_name",
        "address",
        "city",
        "category",
        "price",
        "audience",
        "summary",
      ],
    },
  };

  const instructions = [
    "You are reviewing a Lisbon website page to decide whether it describes a real event that should be included on a Lisbon events website.",
    "Be conservative but not overly strict.",
    "Include concerts, festivals, exhibitions, markets, parades, theater, screenings, talks, workshops, guided visits, and similar scheduled happenings.",
    "Exclude city news, rankings, restaurant roundups, travel guides, infrastructure updates, editorial features, monuments/garden explainers, political news, and general tourism articles.",
    "If the page is a roundup article listing many events, set is_event=false.",
    "Return normalized ISO dates only when clearly supported by the page. If unknown, use null.",
    "If the city is not explicit but the page clearly refers to Lisbon, use Lisbon.",
    "Confidence must be between 0 and 1.",
  ].join(" ");

  const inputText = [
    `URL: ${candidate.url}`,
    `Slug: ${candidate.slug}`,
    `Title: ${candidate.title}`,
    `Description: ${candidate.description}`,
    "Page text excerpt:",
    candidate.text,
  ].join("\n\n");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions,
      input: inputText,
      text: {
        format: {
          type: "json_schema",
          name: schema.name,
          strict: true,
          schema: schema.schema,
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  let rawText = "";

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (!Array.isArray(item.content)) continue;
      for (const content of item.content) {
        if (typeof content.text === "string" && content.text.trim()) {
          rawText = content.text;
          break;
        }
      }
      if (rawText) break;
    }
  }

  if (!rawText) {
    throw new Error(`No structured output text returned for ${candidate.url}`);
  }

  return JSON.parse(rawText);
}

async function main() {
  const stamp =
    process.argv[2] ||
    latestDir(path.join("tmp", "ingest", "normalized"));

  const sourceKey = "lisboa_secreta";
  const normalizedPath = path.join(
    "tmp",
    "ingest",
    "normalized",
    stamp,
    `${sourceKey}.json`
  );

  const rawDir = path.join(
    "tmp",
    "ingest",
    "raw",
    stamp,
    sourceKey
  );

  const reviewDir = path.join("tmp", "ingest", "review", stamp);
  safeMkdir(reviewDir);

  const normalized = readJson(normalizedPath);
  const rejected = Array.isArray(normalized?.debug?.rejected_non_events)
    ? normalized.debug.rejected_non_events
    : [];

  const candidates = rejected
    .filter((x) => Number(x?.score) >= 1)
    .map((x) => ({
      url: x.url,
      title: x.title,
      score: x.score,
    }));

  const results = [];
  const rescuedEvents = [];
  const approvedRescues = [];

  console.log(`Review stamp: ${stamp}`);
  console.log(`Rejected candidates: ${rejected.length}`);
  console.log(`Borderline candidates for AI review: ${candidates.length}`);
  console.log(`Minimum confidence: ${MIN_CONFIDENCE}`);

  for (const item of candidates) {
    const slug = slugFromUrl(item.url);
    const rawFile = path.join(rawDir, `${safeFileName(slug) || "page"}.html`);

    if (!fs.existsSync(rawFile)) {
      results.push({
        url: item.url,
        title: item.title,
        score: item.score,
        error: `Missing raw file: ${rawFile}`,
      });
      continue;
    }

    const html = fs.readFileSync(rawFile, "utf8");
    const candidate = extractPageSignals(html, item.url);

    try {
      console.log(`→ Reviewing: ${candidate.title}`);
      const review = await reviewCandidate(candidate);
      const approval = shouldApproveRescue(review, candidate);

      const record = {
        url: item.url,
        original_title: item.title,
        original_score: item.score,
        approval,
        review,
      };

      results.push(record);

      if (review.is_event && Number(review.confidence) >= 0.6) {
        rescuedEvents.push({
          source: sourceKey,
          source_url: item.url,
          source_id: slug,

          title: review.title || candidate.title,
          description: review.summary || candidate.description || "",
          image_url: "",

          occurrences: [
            {
              starts_at: review.starts_at || "",
              ends_at: review.ends_at || "",
              date_text: "",
            },
          ],

          location_name: review.location_name || "",
          address: review.address || "",
          city: review.city || "Lisbon",

          category: review.category || "",
          audience: Array.isArray(review.audience) ? review.audience : [],
          price: review.price || "",

          source_evidence_path: rawFile,
          ai_review: {
            confidence: review.confidence,
            reason: review.reason,
            approval_reason: approval.reason,
          },
        });
      }

      if (approval.ok) {
        approvedRescues.push({
          source: sourceKey,
          source_url: item.url,
          source_id: slug,

          title: review.title || candidate.title,
          description: review.summary || candidate.description || "",
          image_url: "",

          occurrences: [
            {
              starts_at: review.starts_at || "",
              ends_at: review.ends_at || "",
              date_text: "",
            },
          ],

          location_name: review.location_name || "",
          address: review.address || "",
          city: review.city || "Lisbon",

          category: review.category || "",
          audience: Array.isArray(review.audience) ? review.audience : [],
          price: review.price || "",

          source_evidence_path: rawFile,
          ai_review: {
            confidence: review.confidence,
            reason: review.reason,
            approval_reason: approval.reason,
          },
        });
      }
    } catch (error) {
      results.push({
        url: item.url,
        title: item.title,
        score: item.score,
        error: String(error?.message || error),
      });
    }
  }

  const reviewsPath = path.join(reviewDir, "lisboa_secreta_ai_review.json");
  const rescuedPath = path.join(reviewDir, "lisboa_secreta_ai_rescued_events.json");
  const approvedPath = path.join(reviewDir, "lisboa_secreta_ai_approved_rescues.json");

  fs.writeFileSync(
    reviewsPath,
    JSON.stringify(
      {
        stamp,
        model: OPENAI_MODEL,
        min_confidence: MIN_CONFIDENCE,
        total_candidates: candidates.length,
        reviewed: results.length,
        rescued: rescuedEvents.length,
        approved_rescues: approvedRescues.length,
        results,
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    rescuedPath,
    JSON.stringify(
      {
        stamp,
        model: OPENAI_MODEL,
        rescued_events: rescuedEvents,
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    approvedPath,
    JSON.stringify(
      {
        stamp,
        model: OPENAI_MODEL,
        min_confidence: MIN_CONFIDENCE,
        approved_rescues: approvedRescues,
      },
      null,
      2
    )
  );

  console.log("Done.");
  console.log("Reviews:", reviewsPath);
  console.log("Rescued:", rescuedPath);
  console.log("Approved rescues:", approvedPath);
  console.log("Approved rescue count:", approvedRescues.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
