import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { enrichOne } from "./serpapi_openai_enrich.mjs";

const INPUT_CSV = process.env.ENRICH_INPUT_CSV || process.argv[2];
const OUTPUT_DIR =
  process.env.ENRICH_OUTPUT_DIR || path.join("tmp", "ingest", "enriched");
const BATCH_LIMIT = Number(process.env.ENRICH_BATCH_LIMIT || 25);
const BATCH_DELAY_MS = Number(process.env.ENRICH_BATCH_DELAY_MS || 1200);
const MIN_EVENT_SCORE = Number(process.env.ENRICH_MIN_EVENT_SCORE || 8);

if (!INPUT_CSV) {
  console.error(
    'Usage: ENRICH_INPUT_CSV="path/to/file.csv" node scripts/ingest/enrich/serpapi_openai_batch.mjs'
  );
  process.exit(1);
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate()
  )}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(
    d.getUTCSeconds()
  )}Z`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function readCsv(csvPath) {
  const txt = fs.readFileSync(csvPath, "utf8");
  const parsed = Papa.parse(txt, { header: true, skipEmptyLines: true });
  return parsed.data || [];
}

function writeJsonl(filePath, items) {
  const lines = items.map((x) => JSON.stringify(x)).join("\n") + "\n";
  fs.writeFileSync(filePath, lines, "utf8");
}

function writeCsv(filePath, rows) {
  const csv = Papa.unparse(rows, { quotes: true });
  fs.writeFileSync(filePath, csv, "utf8");
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

function normalizeText(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function safeUrl(raw) {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function safeUrlHost(rawUrl) {
  return safeUrl(rawUrl)?.hostname?.toLowerCase() || "";
}

function safeUrlPath(rawUrl) {
  return safeUrl(rawUrl)?.pathname?.toLowerCase() || "";
}

const EVENT_TITLE_PATTERNS = [
  /\bconcert\b/i,
  /\bfestival\b/i,
  /\bexhibition\b/i,
  /\bshow\b/i,
  /\blive\b/i,
  /\bopera\b/i,
  /\bdance\b/i,
  /\bballet\b/i,
  /\btheat(?:re|er)\b/i,
  /\bmusical\b/i,
  /\bcinema\b/i,
  /\bfilm\b/i,
  /\bscreening\b/i,
  /\bmarket\b/i,
  /\bfair\b/i,
  /\bmarathon\b/i,
  /\brun\b/i,
  /\bworkshop\b/i,
  /\bconference\b/i,
  /\bsummit\b/i,
  /\bimmersive\b/i,
  /\bexperience\b/i,
  /\bparty\b/i,
  /\bclub\b/i,
  /\bdj\b/i,
  /\bopening\b/i,
  /\bperformance\b/i,
  /\btour\b/i,
  /\bmasterclass\b/i,
  /\btasting\b/i,
  /\bfeira\b/i,
  /\bmercado\b/i,
  /\bconcerto\b/i,
  /\bexposi[cç][aã]o\b/i,
  /\bespet[aá]culo\b/i,
  /\bteatro\b/i,
  /\bcine(?:ma)?\b/i,
  /\boficina\b/i,
  /\bevento\b/i,
];

const WEAK_TITLE_PATTERNS = [
  /\bcollection\b/i,
  /\bcommunity\b/i,
  /\barts?\b/i,
  /\bexperience\b/i,
  /\bprogram(?:me)?\b/i,
  /\btour\b/i,
];

const NON_EVENT_PATTERNS = [
  /\bguide\b/i,
  /\bsecret guide\b/i,
  /\bwhat to do\b/i,
  /\bthings to do\b/i,
  /\bbest\b/i,
  /\btop\s+\d+\b/i,
  /\blandmarks\b/i,
  /\battractions\b/i,
  /\brestaurant(?:s)?\b/i,
  /\bmost booked restaurant\b/i,
  /\bhidden corners\b/i,
  /\bitinerary\b/i,
  /\bdestination\b/i,
  /\btravel tips?\b/i,
  /\bcity guide\b/i,
  /\bneighbou?rhood\b/i,
  /\bbackpack\b/i,
  /\bmetro\b/i,
  /\btransport\b/i,
  /\bwar on\b/i,
  /\bnews\b/i,
  /\bopinion\b/i,
  /\beditorial\b/i,
  /\breview\b/i,
  /\bwhere to eat\b/i,
  /\bwhere to stay\b/i,
  /\bbest places\b/i,
  /\bmust[- ]see\b/i,
  /\bvisit lisbon\b/i,
  /\bdiscover lisbon\b/i,
];

const STRONG_DATE_PATTERNS = [
  /\b\d{4}-\d{2}-\d{2}\b/,
  /\b\d{1,2}:\d{2}\b/,
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i,
  /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  /\b(?:segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)\b/i,
  /\b(?:janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i,
];

const GOOD_CATEGORY_PATTERNS = [
  /\bmusic\b/i,
  /\bart\b/i,
  /\btheat(?:re|er)\b/i,
  /\bfilm\b/i,
  /\bcinema\b/i,
  /\bfestival\b/i,
  /\bfamily\b/i,
  /\bfood\b/i,
  /\bdrink\b/i,
  /\bnightlife\b/i,
  /\bsports?\b/i,
  /\bdance\b/i,
  /\bopera\b/i,
  /\bexhibition\b/i,
  /\bshow\b/i,
  /\bmarket\b/i,
];

const BAD_CATEGORY_PATTERNS = [
  /\bguide\b/i,
  /\bnews\b/i,
  /\blifestyle\b/i,
  /\btravel\b/i,
  /\brestaurants?\b/i,
  /\beditorial\b/i,
];

const GOOD_HOST_PATTERNS = [
  /(eventbrite|feverup|ticketline|bol\.pt|seetickets|shotgun\.live|dice\.fm|bandsintown|songkick)/i,
  /(visitlisboa\.com)/i,
  /(agendalx\.pt)/i,
];

const BAD_HOST_PATTERNS = [
  /(wikipedia\.org|giift\.com|oladaniela\.com|tripadvisor|booking\.com|expedia|airbnb)/i,
];

const GOOD_PATH_PATTERNS = [
  /\/events\/[^/?#]+/i,
  /\/event\/[^/?#]+/i,
  /\/agenda\/[^/?#]+/i,
  /\/festival/i,
  /\/concert/i,
  /\/exhibition/i,
  /\/show/i,
  /\/tickets?/i,
  /\/bilhetes?/i,
];

const BAD_PATH_PATTERNS = [
  /\/en\/?$/i,
  /\/pt\/?$/i,
  /^\/events\/?$/i,
  /^\/event\/?$/i,
  /\/places\//i,
  /\/category\//i,
  /\/tag\//i,
  /\/author\//i,
  /\/blog\//i,
  /\/news\//i,
  /\/guide/i,
  /\/what(?:s|-|_)?on\/?$/i,
  /\/destinations?/i,
  /\/restaurants?/i,
  /\/best-/i,
];

function scoreEventLikelihood(row) {
  const title = firstNonEmpty(row.title);
  const category = firstNonEmpty(row.category);
  const source = firstNonEmpty(row.source);
  const url = firstNonEmpty(row.url, row.canonical_url, row.source_url, row.ticket_url);
  const dateText = firstNonEmpty(row.date_text);
  const host = safeUrlHost(url);
  const path = safeUrlPath(url);

  const titleNorm = normalizeText(title);
  const categoryNorm = normalizeText(category);
  const sourceNorm = normalizeText(source);

  let score = 0;
  const reasons = [];
  let strongSignals = 0;

  if (!titleNorm) {
    return { score: -999, reasons: ["missing_title"], eventLike: false, strongSignals: 0 };
  }

  score += 1;
  reasons.push("has_title");

  for (const re of EVENT_TITLE_PATTERNS) {
    if (re.test(title)) {
      score += 4;
      reasons.push(`title_event_pattern:${re}`);
      strongSignals += 1;
      break;
    }
  }

  for (const re of STRONG_DATE_PATTERNS) {
    if (re.test(title) || re.test(dateText)) {
      score += 3;
      reasons.push(`date_signal:${re}`);
      strongSignals += 1;
      break;
    }
  }

  if (dateText) {
    score += 1;
    reasons.push("has_date_text");
  }

  if (categoryNorm) {
    for (const re of GOOD_CATEGORY_PATTERNS) {
      if (re.test(category)) {
        score += 2;
        reasons.push("good_category");
        strongSignals += 1;
        break;
      }
    }

    for (const re of BAD_CATEGORY_PATTERNS) {
      if (re.test(category)) {
        score -= 5;
        reasons.push("bad_category");
        break;
      }
    }
  }

  if (sourceNorm === "visitlisboa") {
    score += 1;
    reasons.push("source_visitlisboa");
  }

  if (sourceNorm === "lisboa_secreta") {
    score -= 2;
    reasons.push("source_lisboa_secreta_requires_stronger_proof");
  }

  if (host) {
    for (const re of GOOD_HOST_PATTERNS) {
      if (re.test(host)) {
        score += 2;
        reasons.push("good_host");
        break;
      }
    }

    for (const re of BAD_HOST_PATTERNS) {
      if (re.test(host)) {
        score -= 6;
        reasons.push("bad_host");
        break;
      }
    }
  }

  if (path) {
    for (const re of GOOD_PATH_PATTERNS) {
      if (re.test(path)) {
        score += 4;
        reasons.push("good_path");
        strongSignals += 1;
        break;
      }
    }

    for (const re of BAD_PATH_PATTERNS) {
      if (re.test(path)) {
        score -= 6;
        reasons.push(`bad_path:${re}`);
        break;
      }
    }
  }

  for (const re of NON_EVENT_PATTERNS) {
    if (re.test(title)) {
      score -= 7;
      reasons.push(`non_event_title:${re}`);
      break;
    }
  }

  if (/\bpresident\b/i.test(title) && !/\bconcert|festival|show|event|conference|exhibition\b/i.test(title)) {
    score -= 5;
    reasons.push("likely_news_or_civic_item");
  }

  if (firstNonEmpty(row.starts_at, row.start_date)) {
    score += 2;
    reasons.push("already_has_start_date");
    strongSignals += 1;
  }

  if (firstNonEmpty(row.location_name, row.venue_name)) {
    score += 1;
    reasons.push("already_has_venue");
  }

  const weakOnly =
    WEAK_TITLE_PATTERNS.some((re) => re.test(title)) &&
    strongSignals < 2 &&
    !firstNonEmpty(row.starts_at, row.start_date);

  if (weakOnly) {
    score -= 4;
    reasons.push("weak_title_without_support");
  }

  const eventLike = score >= MIN_EVENT_SCORE && strongSignals >= 1;
  return { score, reasons, eventLike, strongSignals };
}

function rowNeedsEnrichment(row) {
  const candidate = scoreEventLikelihood(row);
  if (!candidate.eventLike) return false;

  const missingTitle = !firstNonEmpty(row.title);
  if (missingTitle) return false;

  const missingStarts = !firstNonEmpty(row.starts_at, row.start_date);
  const missingVenue = !firstNonEmpty(row.location_name, row.venue_name, row.address);
  const missingImage = !firstNonEmpty(row.image_url);
  const missingUrl = !firstNonEmpty(row.url, row.ticket_url, row.canonical_url);

  const missingImportant = missingStarts || missingVenue || missingImage || missingUrl;
  if (!missingImportant) return false;

  return candidate.score >= MIN_EVENT_SCORE && candidate.strongSignals >= 1;
}

function buildHints(row) {
  const hints = {
    source: firstNonEmpty(row.source),
    source_url: firstNonEmpty(row.source_url, row.url, row.canonical_url),
    date_text: firstNonEmpty(row.date_text),
    venue_hint: firstNonEmpty(row.location_name, row.venue_name),
    address_hint: firstNonEmpty(row.address),
    category_hint: firstNonEmpty(row.category),
    city_hint: firstNonEmpty(row.city, "Lisbon"),
    price_hint: firstNonEmpty(row.price),
  };

  const cleaned = {};
  for (const [k, v] of Object.entries(hints)) {
    if (v) cleaned[k] = v;
  }
  return Object.keys(cleaned).length ? cleaned : null;
}

function normalizePatchRow(sourceRow, enrichResult) {
  const ex = enrichResult?.extracted || {};
  const image_url =
    Array.isArray(ex.images) && ex.images.length ? ex.images[0] : "";

  const candidate = scoreEventLikelihood(sourceRow);

  return {
    source: firstNonEmpty(sourceRow.source),
    source_id: firstNonEmpty(sourceRow.source_id),
    original_title: firstNonEmpty(sourceRow.title),
    resolved_title: firstNonEmpty(ex.title, sourceRow.title),

    starts_at: firstNonEmpty(ex.start_date, sourceRow.starts_at),
    start_time: firstNonEmpty(ex.start_time),
    ends_at: firstNonEmpty(ex.end_date, sourceRow.ends_at),
    end_time: firstNonEmpty(ex.end_time),

    venue_name: firstNonEmpty(ex.venue_name, sourceRow.location_name, sourceRow.venue_name),
    location_name: firstNonEmpty(ex.venue_name, sourceRow.location_name, sourceRow.venue_name),
    address: firstNonEmpty(ex.address, sourceRow.address),
    city: firstNonEmpty(ex.city, sourceRow.city, "Lisbon"),

    price: firstNonEmpty(ex.price, sourceRow.price),
    currency: firstNonEmpty(ex.currency),

    image_url: firstNonEmpty(image_url, sourceRow.image_url),
    canonical_url: firstNonEmpty(ex.canonical_url, sourceRow.canonical_url, sourceRow.url),
    ticket_url: firstNonEmpty(ex.ticket_url, sourceRow.ticket_url),

    source_notes: firstNonEmpty(ex.source_notes),
    query_title: enrichResult?.query?.title || "",
    chosen_url: enrichResult?.chosen_url || "",
    enrich_ok: enrichResult?.ok ? "true" : "false",
    needs_review: "true",

    candidate_score: String(candidate.score),
    candidate_strong_signals: String(candidate.strongSignals),
    candidate_reasons: candidate.reasons.join(" | "),
  };
}

async function main() {
  const stamp = nowStamp();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const rows = readCsv(INPUT_CSV);
  const allScored = rows.map((row) => ({
    row,
    candidate: scoreEventLikelihood(row),
  }));

  const eligible = allScored.filter(({ row }) => rowNeedsEnrichment(row));
  const candidates = eligible.slice(0, BATCH_LIMIT);

  console.log(`Input rows:        ${rows.length}`);
  console.log(`Event-like rows:   ${allScored.filter((x) => x.candidate.eventLike).length}`);
  console.log(`Candidates:        ${eligible.length}`);
  console.log(`Processing limit:  ${candidates.length}`);
  console.log(`Min event score:   ${MIN_EVENT_SCORE}`);

  const topEligible = eligible
    .slice()
    .sort((a, b) => b.candidate.score - a.candidate.score)
    .slice(0, 12);

  if (topEligible.length) {
    console.log(`\nTop eligible rows:`);
    for (const item of topEligible) {
      console.log(
        `  score=${item.candidate.score} strong=${item.candidate.strongSignals} title=${firstNonEmpty(item.row.title)}`
      );
    }
  }

  const results = [];
  const patchRows = [];

  for (let i = 0; i < candidates.length; i++) {
    const { row, candidate } = candidates[i];
    const title = firstNonEmpty(row.title);
    const city = firstNonEmpty(row.city, "Lisbon");
    const hints = buildHints(row);

    console.log(`\n[${i + 1}/${candidates.length}] Enriching: ${title}`);
    console.log(`  score=${candidate.score}`);
    console.log(`  strong=${candidate.strongSignals}`);
    console.log(`  reasons=${candidate.reasons.join(" | ")}`);

    try {
      const enriched = await enrichOne({ title, city, hints });

      results.push({
        input: row,
        candidate,
        result: enriched,
      });

      patchRows.push(normalizePatchRow(row, enriched));

      console.log(
        `  ok=${enriched.ok} chosen=${firstNonEmpty(enriched.chosen_url, "(none)")}`
      );
    } catch (err) {
      const fail = {
        ok: false,
        query: { title, city, hints },
        chosen_url: "",
        extracted: null,
        error: String(err?.message || err),
      };

      results.push({
        input: row,
        candidate,
        result: fail,
      });

      patchRows.push(normalizePatchRow(row, fail));

      console.log(`  failed: ${fail.error}`);
    }

    if (i < candidates.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const jsonlPath = path.join(OUTPUT_DIR, `serpapi_openai_batch_${stamp}.jsonl`);
  const csvPath = path.join(OUTPUT_DIR, `serpapi_openai_patch_${stamp}.csv`);

  writeJsonl(jsonlPath, results);
  writeCsv(csvPath, patchRows);

  console.log(`\n✅ Done`);
  console.log(`JSONL: ${jsonlPath}`);
  console.log(`CSV:   ${csvPath}`);
}

main().catch((err) => {
  console.error("Batch enrich failed:", err);
  process.exit(1);
});
