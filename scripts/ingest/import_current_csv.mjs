import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";

function safeTrim(v) {
  return String(v ?? "").trim();
}

function normalizeText(v) {
  return safeTrim(v).toLowerCase();
}

function normalizeUrl(v) {
  const s = safeTrim(v);
  if (!s) return "";
  try {
    const u = new URL(s);
    u.hash = "";
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString().toLowerCase();
  } catch {
    return s.toLowerCase();
  }
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

function parseDateOnly(v) {
  const s = safeTrim(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function toIsoOrNull(v) {
  const s = safeTrim(v);
  if (!s) return null;

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return `${s}T00:00:00.000Z`;
  }

  return null;
}

function toAudienceArray(v) {
  const s = safeTrim(v);
  if (!s) return null;

  const parts = s
    .split(/[|,;/]+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  const seen = new Set();
  const out = [];

  for (const part of parts) {
    let normalized = part;
    const lower = part.toLowerCase();

    if (lower === "all ages" || lower === "all-ages") normalized = "All Ages";
    else if (lower === "family") normalized = "Family";
    else if (lower === "kids" || lower === "children") normalized = "Kids";
    else if (lower === "teens" || lower === "teen") normalized = "Teens";
    else if (lower === "adults" || lower === "adult") normalized = "Adults";

    if (!seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  }

  return out.length ? out : null;
}

function toNumberOrNull(v) {
  const s = safeTrim(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function canonicalSignature(input) {
  return [
    normalizeText(input.title),
    parseDateOnly(input.starts_at),
    normalizeText(input.location_name),
  ].join("||");
}

function buildImportedSlug(row) {
  const existing = safeTrim(row.slug);
  if (existing) return existing;

  const title = safeTrim(row.title);
  const date = parseDateOnly(row.starts_at);
  return slugify(`${title}-${date || "event"}`);
}

async function readCsv(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = Papa.parse(raw, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    throw new Error(
      `CSV parse failed for ${path.basename(filePath)}: ${parsed.errors[0]?.message || "unknown error"}`
    );
  }

  return (parsed.data || []).filter((row) =>
    Object.values(row || {}).some((v) => safeTrim(v) !== "")
  );
}

async function fetchExistingEvents(supabase) {
  const pageSize = 1000;
  const all = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("events")
      .select("id,slug,title,starts_at,location_name,source_url")
      .order("starts_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Failed to read existing events: ${error.message}`);

    const rows = data || [];
    all.push(...rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

function buildEventRecord(row, slug) {
  const startsAt = toIsoOrNull(row.starts_at);
  if (!startsAt) {
    throw new Error("Invalid starts_at");
  }

  return {
    slug,
    title: safeTrim(row.title) || slug,
    description: safeTrim(row.description) || null,
    starts_at: startsAt,
    ends_at: toIsoOrNull(row.ends_at),
    category: safeTrim(row.category) || null,
    location_name: safeTrim(row.location_name) || null,
    address: safeTrim(row.address) || null,
    city: safeTrim(row.city) || "Lisbon",
    source_url: normalizeUrl(row.source_url || row.url) || null,
    ticket_url: normalizeUrl(row.source_url || row.url) || null,
    image_url: safeTrim(row.image_url) || null,
    price: safeTrim(row.price) || null,
    audience: toAudienceArray(row.audience),
    status: "approved",
    latitude: toNumberOrNull(row.latitude),
    longitude: toNumberOrNull(row.longitude),
  };
}

async function bulkUpsertEvents(supabase, records) {
  const chunkSize = 200;
  let total = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);

    const { error } = await supabase
      .from("events")
      .upsert(chunk, { onConflict: "slug" });

    if (error) {
      throw new Error(`Failed upserting events chunk ${i}-${i + chunk.length - 1}: ${error.message}`);
    }

    total += chunk.length;
    console.log(`Upserted ${total}/${records.length}`);
  }

  return total;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL not set");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");

  const supabase = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const csvPath = path.join(process.cwd(), "public", "events.csv");
  const importedEvents = await readCsv(csvPath);
  const existingEvents = await fetchExistingEvents(supabase);

  const bySlug = new Map();
  const bySourceUrl = new Map();
  const bySignature = new Map();

  for (const ev of existingEvents) {
    const slug = safeTrim(ev.slug);
    if (slug) bySlug.set(slug, ev);

    const sourceUrl = normalizeUrl(ev.source_url);
    if (sourceUrl) bySourceUrl.set(sourceUrl, ev);

    const sig = canonicalSignature(ev);
    if (sig !== "||||") bySignature.set(sig, ev);
  }

  let dedupedToExisting = 0;
  const skipped = [];
  const recordsBySlug = new Map();

  for (const row of importedEvents) {
    const importedSlug = buildImportedSlug(row);
    const importedSourceUrl = normalizeUrl(row.source_url || row.url);
    const importedSignature = canonicalSignature(row);

    const sourceMatch = importedSourceUrl ? bySourceUrl.get(importedSourceUrl) : undefined;
    const signatureMatch = importedSignature ? bySignature.get(importedSignature) : undefined;
    const slugMatch = bySlug.get(importedSlug);

    let targetSlug = importedSlug;

    if (sourceMatch?.slug) {
      targetSlug = sourceMatch.slug;
      dedupedToExisting += 1;
    } else if (slugMatch?.slug) {
      targetSlug = slugMatch.slug;
      dedupedToExisting += 1;
    } else if (signatureMatch?.slug) {
      targetSlug = signatureMatch.slug;
      dedupedToExisting += 1;
    }

    try {
      const record = buildEventRecord(row, targetSlug);
      recordsBySlug.set(targetSlug, record);
    } catch (error) {
      skipped.push({
        slug: targetSlug,
        title: safeTrim(row.title) || targetSlug,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const records = Array.from(recordsBySlug.values());

  console.log("");
  console.log(`CSV rows: ${importedEvents.length}`);
  console.log(`Existing events: ${existingEvents.length}`);
  console.log(`Prepared upserts: ${records.length}`);
  console.log(`Matched existing rows: ${dedupedToExisting}`);
  console.log(`Skipped invalid: ${skipped.length}`);

  if (skipped.length > 0) {
    console.log("");
    console.log("Skipped examples:");
    for (const row of skipped.slice(0, 20)) {
      console.log(`- ${row.slug}: ${row.reason}`);
    }
  }

  if (records.length === 0) {
    console.log("");
    console.log("No valid records to upsert.");
    return;
  }

  console.log("");
  const total = await bulkUpsertEvents(supabase, records);

  console.log("");
  console.log(`Inserted or updated: ${total}`);

  const { count, error: countError } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Failed counting events after import: ${countError.message}`);
  }

  console.log(`Events in DB now: ${count ?? 0}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
