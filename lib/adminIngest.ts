import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import { supabaseServer } from "@/lib/supabaseServer";

type CsvRow = Record<string, string>;

type ExistingEvent = {
  id: string;
  slug: string;
  title: string | null;
  starts_at: string | null;
  location_name: string | null;
  source_url: string | null;
};

type EventRecord = {
  slug: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  category: string | null;
  location_name: string | null;
  address: string | null;
  city: string | null;
  source_url: string | null;
  image_url: string | null;
  ticket_url: string | null;
  price: string | null;
  audience: string[] | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
};

type SkippedRow = {
  slug: string;
  title: string;
  reason: string;
};

type IngestSummary = {
  ok: boolean;
  mode: "import-current-csv";
  counts: {
    csv_events: number;
    existing_events: number;
    prepared_upserts: number;
    inserted_or_updated: number;
    deduped_to_existing: number;
    skipped_invalid: number;
  };
  skipped: SkippedRow[];
};

function safeTrim(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeText(v: unknown): string {
  return safeTrim(v).toLowerCase();
}

function normalizeUrl(v: unknown): string {
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

function slugify(input: unknown): string {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function parseDateOnly(v: unknown): string {
  const s = safeTrim(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function toIsoOrNull(v: unknown): string | null {
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

function toAudienceArray(v: unknown): string[] | null {
  const s = safeTrim(v);
  if (!s) return null;

  const parts = s
    .split(/[|,;/]+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  const seen = new Set<string>();
  const out: string[] = [];

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

function toNumberOrNull(v: unknown): number | null {
  const s = safeTrim(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function canonicalSignature(input: {
  title?: unknown;
  starts_at?: unknown;
  location_name?: unknown;
}) {
  return [
    normalizeText(input.title),
    parseDateOnly(input.starts_at),
    normalizeText(input.location_name),
  ].join("||");
}

function buildImportedSlug(row: CsvRow): string {
  const existing = safeTrim(row.slug);
  if (existing) return existing;

  const title = safeTrim(row.title);
  const date = parseDateOnly(row.starts_at);
  return slugify(`${title}-${date || "event"}`);
}

async function readCsv(filePath: string): Promise<CsvRow[]> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = Papa.parse<CsvRow>(raw, {
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

async function fetchExistingEvents(): Promise<ExistingEvent[]> {
  const supabase = supabaseServer();
  const pageSize = 1000;
  const all: ExistingEvent[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("events")
      .select("id,slug,title,starts_at,location_name,source_url")
      .order("starts_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Failed to read existing events: ${error.message}`);

    const rows = (data || []) as ExistingEvent[];
    all.push(...rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

function buildEventRecord(row: CsvRow, slug: string): EventRecord {
  const startsAt = toIsoOrNull(row.starts_at);
  if (!startsAt) {
    throw new Error(`Invalid starts_at`);
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
    image_url: safeTrim(row.image_url) || null,
    ticket_url: normalizeUrl(row.source_url || row.url) || null,
    price: safeTrim(row.price) || null,
    audience: toAudienceArray(row.audience),
    status: "approved",
    latitude: toNumberOrNull(row.latitude),
    longitude: toNumberOrNull(row.longitude),
  };
}

async function bulkUpsertEvents(records: EventRecord[]) {
  const supabase = supabaseServer();
  const chunkSize = 200;
  let total = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);

    const { error } = await supabase
      .from("events")
      .upsert(chunk, { onConflict: "slug" });

    if (error) {
      throw new Error(`Failed upserting events chunk: ${error.message}`);
    }

    total += chunk.length;
  }

  return total;
}

export async function runAdminIngest(): Promise<IngestSummary> {
  const repoRoot = process.cwd();
  const eventsCsv = path.join(repoRoot, "public", "events.csv");

  const importedEvents = await readCsv(eventsCsv);
  const existingEvents = await fetchExistingEvents();

  const bySlug = new Map<string, ExistingEvent>();
  const bySourceUrl = new Map<string, ExistingEvent>();
  const bySignature = new Map<string, ExistingEvent>();

  for (const ev of existingEvents) {
    const slug = safeTrim(ev.slug);
    if (slug) bySlug.set(slug, ev);

    const sourceUrl = normalizeUrl(ev.source_url);
    if (sourceUrl) bySourceUrl.set(sourceUrl, ev);

    const sig = canonicalSignature(ev);
    if (sig !== "||||") bySignature.set(sig, ev);
  }

  let dedupedToExisting = 0;
  const recordsBySlug = new Map<string, EventRecord>();
  const skipped: SkippedRow[] = [];

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
    } catch (error: any) {
      skipped.push({
        slug: targetSlug,
        title: safeTrim(row.title) || targetSlug,
        reason: error?.message || "Invalid row",
      });
    }
  }

  const records = Array.from(recordsBySlug.values());
  const insertedOrUpdated = records.length > 0 ? await bulkUpsertEvents(records) : 0;

  return {
    ok: true,
    mode: "import-current-csv",
    counts: {
      csv_events: importedEvents.length,
      existing_events: existingEvents.length,
      prepared_upserts: records.length,
      inserted_or_updated: insertedOrUpdated,
      deduped_to_existing: dedupedToExisting,
      skipped_invalid: skipped.length,
    },
    skipped: skipped.slice(0, 50),
  };
}
