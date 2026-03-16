import { supabaseServer } from "@/lib/supabaseServer";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const AUDIENCE_ALL = "All Ages";
const AUDIENCE_EXPANDED = ["All Ages", "Family", "Kids", "Teens", "Adults"];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }

    if (c === "\r") {
      i++;
      continue;
    }

    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }

    field += c;
    i++;
  }

  row.push(field);
  rows.push(row);

  return rows.filter((r) => r.some((cell) => cell !== ""));
}

function safeISO(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function boolFrom(v: any): boolean {
  if (v === true || v === false) return v;
  if (v == null) return false;
  const t = String(v).trim().toLowerCase();
  return t === "true" || t === "1" || t === "yes";
}

function dateOnlyFromAny(value?: string | null): string | null {
  if (!value) return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function startOfDayIso(dateOnly: string): string {
  return `${dateOnly}T00:00:00.000Z`;
}

function endOfDayIso(dateOnly: string): string {
  return `${dateOnly}T23:59:59.999Z`;
}

function replaceDateKeepingTime(originalIso: string | null | undefined, newDate: string): string {
  const safe = safeISO(originalIso);
  if (!safe) return startOfDayIso(newDate);
  return `${newDate}${safe.slice(10)}`;
}

type EventRow = {
  id: string;
  slug?: string | null;
  title: string;
  description: string | null;

  // These are the placement timestamps for the returned occurrence row.
  starts_at: string;
  ends_at: string | null;

  // These preserve the original event-level range.
  series_starts_at?: string | null;
  series_ends_at?: string | null;

  occurrence_date?: string | null;

  category: string | null;
  location_name: string | null;
  city: string | null;
  address: string | null;
  ticket_url: string | null;
  image_url: string | null;
  created_at: string | null;
  all_day: boolean | null;
  age: string | null;
  audience: string[];
  organizer_email: string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  source?: "db" | "csv";
};

async function loadCatalog(): Promise<{ list: string[]; canon: Map<string, string> }> {
  const { data, error } = await supabaseServer().from("category_catalog").select("name");
  if (error) throw new Error(error.message);

  const list = (data || []).map((r: any) => String(r.name));
  const canon = new Map<string, string>();

  for (const name of list) {
    canon.set(name.trim().toLowerCase(), name);
  }

  return { list, canon };
}

function normalizeCategory(raw: any, canon: Map<string, string>): string | null {
  const val = (raw ?? "").toString().trim();
  if (!val) return null;
  return canon.get(val.toLowerCase()) ?? null;
}

function normalizeAudienceForResponse(row: any): string[] {
  const aud = row?.audience;
  if (Array.isArray(aud) && aud.length > 0) {
    return aud.map((x: any) => String(x));
  }
  return AUDIENCE_EXPANDED;
}

function isAllAgesRow(row: any): boolean {
  const aud = row?.audience;

  if (Array.isArray(aud) && aud.length > 0) {
    return aud.some((x: any) => String(x).toLowerCase() === AUDIENCE_ALL.toLowerCase());
  }

  const age = String(row?.age ?? "").trim().toLowerCase();
  if (!age) return true;
  return age === "all ages" || age === "all-ages";
}

async function loadDbEvents(
  fromISO: string,
  toISO: string,
  category?: string,
  city?: string,
  allAges?: boolean,
  canon?: Map<string, string>
): Promise<EventRow[]> {
  const supabase = supabaseServer();

  const fromDate = dateOnlyFromAny(fromISO);
  const toDate = dateOnlyFromAny(toISO);

  if (!fromDate || !toDate) return [];

  const occQuery = supabase
    .from("event_occurrences")
    .select("event_slug, occurrence_date, starts_at, ends_at, is_all_day")
    .gte("occurrence_date", fromDate)
    .lte("occurrence_date", toDate)
    .order("occurrence_date", { ascending: true });

  const { data: occs, error: occError } = await occQuery;
  if (occError) throw new Error(occError.message);

  const occurrenceRows = occs || [];
  if (occurrenceRows.length === 0) return [];

  const slugs = [...new Set(occurrenceRows.map((r: any) => String(r.event_slug)).filter(Boolean))];
  if (slugs.length === 0) return [];

  let eventQuery = supabase
    .from("events")
    .select(
      "id,slug,title,description,starts_at,ends_at,category,location_name,city,address,ticket_url,image_url,created_at,all_day,age,audience,organizer_email,youtube_url,spotify_url,status"
    )
    .in("slug", slugs)
    .eq("status", "approved");

  if (city) eventQuery = eventQuery.eq("city", city);
  if (category) eventQuery = eventQuery.eq("category", category);

  const { data: eventData, error: eventError } = await eventQuery;
  if (eventError) throw new Error(eventError.message);

  let events = eventData || [];
  if (allAges) events = events.filter(isAllAgesRow);

  const eventMap = new Map<string, any>();
  for (const ev of events) {
    if (ev?.slug) eventMap.set(String(ev.slug), ev);
  }

  const items: EventRow[] = [];

  for (const occ of occurrenceRows) {
    const slug = String(occ.event_slug || "");
    const ev = eventMap.get(slug);
    if (!ev) continue;

    const occurrenceDate = dateOnlyFromAny(occ.occurrence_date);
    if (!occurrenceDate) continue;

    const normalized = canon ? normalizeCategory(ev.category, canon) : ev.category ?? null;

    const placementStartsAt =
      safeISO(occ.starts_at) ||
      replaceDateKeepingTime(ev.starts_at, occurrenceDate);

    const placementEndsAt =
      safeISO(occ.ends_at) ||
      (ev.ends_at ? replaceDateKeepingTime(ev.ends_at, occurrenceDate) : null);

    items.push({
      id: `${String(ev.id)}::${occurrenceDate}`,
      slug,
      title: ev.title,
      description: ev.description ?? null,

      starts_at: placementStartsAt,
      ends_at: placementEndsAt,

      series_starts_at: safeISO(ev.starts_at),
      series_ends_at: safeISO(ev.ends_at),
      occurrence_date: occurrenceDate,

      category: normalized,
      location_name: ev.location_name ?? null,
      city: ev.city ?? null,
      address: ev.address ?? null,
      ticket_url: ev.ticket_url ?? null,
      image_url: ev.image_url ?? null,
      created_at: safeISO(ev.created_at),
      all_day: occ.is_all_day ?? ev.all_day ?? null,
      age: ev.age ?? null,
      audience: normalizeAudienceForResponse(ev),
      organizer_email: ev.organizer_email ?? null,
      youtube_url: ev.youtube_url ?? null,
      spotify_url: ev.spotify_url ?? null,
      source: "db",
    });
  }

  return items.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

async function loadCsvEventsWithOccurrences(
  eventsCsvPath: string,
  occurrencesCsvPath: string,
  fromISO: string,
  toISO: string,
  category?: string,
  city?: string,
  allAges?: boolean,
  canon?: Map<string, string>
): Promise<EventRow[]> {
  let eventRows: string[][] = [];
  let occurrenceRows: string[][] = [];

  try {
    const rawEvents = await readFile(eventsCsvPath, "utf8");
    eventRows = parseCsv(rawEvents);
  } catch {
    return [];
  }

  try {
    const rawOccurrences = await readFile(occurrencesCsvPath, "utf8");
    occurrenceRows = parseCsv(rawOccurrences);
  } catch {
    return [];
  }

  if (eventRows.length < 2 || occurrenceRows.length < 2) return [];

  const eventHeader = eventRows[0].map((h) => h.trim().toLowerCase());
  const occHeader = occurrenceRows[0].map((h) => h.trim().toLowerCase());

  const eidx = (name: string) => eventHeader.indexOf(name);
  const oidx = (name: string) => occHeader.indexOf(name);

  const slugIndex = eidx("slug");
  if (slugIndex === -1) {
    // CSV fallback cannot support occurrence joins unless events.csv includes slug.
    return [];
  }

  const eventsBySlug = new Map<string, any>();

  for (let i = 1; i < eventRows.length; i++) {
    const r = eventRows[i];
    const slug = (r[slugIndex] || "").trim();
    if (!slug) continue;

    const rawCat = r[eidx("category")] || "";
    const normalized = canon ? normalizeCategory(rawCat, canon) : rawCat || null;

    const audRaw = (r[eidx("audience")] || "").trim();
    const audience = audRaw
      ? audRaw.split(",").map((x) => x.trim()).filter(Boolean)
      : AUDIENCE_EXPANDED;

    eventsBySlug.set(slug, {
      id: (r[eidx("id")] || slug).trim(),
      slug,
      title: r[eidx("title")] || "",
      description: r[eidx("description")] || null,
      series_starts_at: safeISO(r[eidx("starts_at")] || null),
      series_ends_at: safeISO(r[eidx("ends_at")] || null),
      category: normalized,
      location_name: r[eidx("location_name")] || null,
      city: (r[eidx("city")] || "").trim() || null,
      address: r[eidx("address")] || null,
      ticket_url: r[eidx("ticket_url")] || r[eidx("source_url")] || r[eidx("url")] || null,
      image_url: r[eidx("image_url")] || null,
      created_at: null,
      all_day: boolFrom(r[eidx("all_day")] || r[eidx("is_all_day")]),
      age: r[eidx("age")] || null,
      audience,
      organizer_email: r[eidx("organizer_email")] || r[eidx("organizer")] || null,
      youtube_url: r[eidx("youtube_url")] || null,
      spotify_url: r[eidx("spotify_url")] || null,
    });
  }

  const fromDate = dateOnlyFromAny(fromISO);
  const toDate = dateOnlyFromAny(toISO);
  if (!fromDate || !toDate) return [];

  const items: EventRow[] = [];

  for (let i = 1; i < occurrenceRows.length; i++) {
    const r = occurrenceRows[i];

    const eventSlug = (r[oidx("event_slug")] || "").trim();
    const occurrenceDate = dateOnlyFromAny(r[oidx("occurrence_date")] || null);

    if (!eventSlug || !occurrenceDate) continue;
    if (occurrenceDate < fromDate || occurrenceDate > toDate) continue;

    const ev = eventsBySlug.get(eventSlug);
    if (!ev) continue;

    if (city && ev.city !== city) continue;
    if (category && ev.category !== category) continue;

    const rowForAgeCheck = { age: ev.age, audience: ev.audience };
    if (allAges && !isAllAgesRow(rowForAgeCheck)) continue;

    const placementStartsAt =
      safeISO(r[oidx("starts_at")] || null) ||
      replaceDateKeepingTime(ev.series_starts_at, occurrenceDate);

    const placementEndsAt =
      safeISO(r[oidx("ends_at")] || null) ||
      (ev.series_ends_at ? replaceDateKeepingTime(ev.series_ends_at, occurrenceDate) : null);

    items.push({
      id: `${ev.id}::${occurrenceDate}`,
      slug: eventSlug,
      title: ev.title,
      description: ev.description,

      starts_at: placementStartsAt,
      ends_at: placementEndsAt,

      series_starts_at: ev.series_starts_at,
      series_ends_at: ev.series_ends_at,
      occurrence_date: occurrenceDate,

      category: ev.category,
      location_name: ev.location_name,
      city: ev.city,
      address: ev.address,
      ticket_url: ev.ticket_url,
      image_url: ev.image_url,
      created_at: ev.created_at,
      all_day: boolFrom(r[oidx("is_all_day")] || ev.all_day),
      age: ev.age,
      audience: Array.isArray(ev.audience) && ev.audience.length ? ev.audience : AUDIENCE_EXPANDED,
      organizer_email: ev.organizer_email,
      youtube_url: ev.youtube_url,
      spotify_url: ev.spotify_url,
      source: "csv",
    });
  }

  return items.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const category = (url.searchParams.get("category") || "").trim() || null;
    const city = (url.searchParams.get("city") || "").trim() || null;
    const allAges = (url.searchParams.get("all_ages") || "").toLowerCase() === "true";

    if (!from || !to) {
      return new Response(JSON.stringify({ error: "Missing from/to" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { list: catalogList, canon } = await loadCatalog();

    const normalizedFilter = category ? canon.get(category.toLowerCase()) ?? "__INVALID__" : null;
    if (normalizedFilter === "__INVALID__") {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    const dbItems = await loadDbEvents(
      from,
      to,
      normalizedFilter ?? undefined,
      city ?? undefined,
      allAges,
      canon
    );

    const eventsCsvPath = path.join(process.cwd(), "public", "events.csv");
    const occurrencesCsvPath = path.join(process.cwd(), "public", "event_occurrences.csv");

    const csvItems = await loadCsvEventsWithOccurrences(
      eventsCsvPath,
      occurrencesCsvPath,
      from,
      to,
      normalizedFilter ?? undefined,
      city ?? undefined,
      allAges,
      canon
    );

    const items: EventRow[] = [...dbItems, ...csvItems].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );

    return new Response(JSON.stringify({ items, catalog: catalogList }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}