// app/api/events/combined/route.ts
import { supabaseServer } from "@/lib/supabaseServer";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------------- utils ---------------------------------- */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0, field = "", row: string[] = [], inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    } else {
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ",") { row.push(field); field = ""; i++; continue; }
      if (c === "\r") { i++; continue; }
      if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
      field += c; i++; continue;
    }
  }
  row.push(field);
  rows.push(row);
  return rows.filter(r => r.some(cell => cell !== ""));
}

function safeISO(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  const ok = !Number.isNaN(d.getTime());
  return ok ? d.toISOString() : null;
}

function boolFrom(v: any): boolean {
  if (v === true || v === false) return v;
  if (v == null) return false;
  const t = String(v).trim().toLowerCase();
  return t === "true" || t === "1" || t === "yes";
}

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;      // ISO
  ends_at: string | null; // ISO
  category: string | null;
  location_name: string | null;
  city: string | null;
  address: string | null;
  ticket_url: string | null;
  image_url: string | null;
  created_at: string | null;
  all_day: boolean | null;
  age: string | null;
  organizer_email: string | null;
  source?: "db" | "csv";
};

/* --------------------------- category catalog --------------------------- */
async function loadCatalog(): Promise<{ list: string[]; canon: Map<string, string> }> {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from("category_catalog").select("name");
  if (error) throw new Error(error.message);
  const list = (data || []).map((r: any) => String(r.name));
  const canon = new Map<string, string>();
  for (const name of list) canon.set(name.trim().toLowerCase(), name);
  return { list, canon };
}

function normalizeCategory(raw: any, canon: Map<string, string>): string | null {
  const val = (raw ?? "").toString().trim();
  if (!val) return null;
  const hit = canon.get(val.toLowerCase());
  return hit ?? null; // only allow catalog values
}

/* ------------------------------- loaders -------------------------------- */
async function loadDbEvents(fromISO: string, toISO: string, category?: string, city?: string, allAges?: boolean, canon?: Map<string, string>): Promise<EventRow[]> {
  const supabase = supabaseServer();
  let q = supabase
    .from("events")
    .select("id,title,description,starts_at,ends_at,category,location_name,city,address,ticket_url,image_url,created_at,all_day,age,organizer_email")
    .gte("starts_at", fromISO)
    .lte("starts_at", toISO);

  if (city) q = q.eq("city", city);
  if (allAges) q = q.or('age.is.null,age.eq."All ages",age.eq."all ages",age.eq."All Ages"');

  if (category) {
    // only match exact normalized catalog name
    q = q.eq("category", category);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data || []).map((r: any) => {
    const normalized = canon ? normalizeCategory(r.category, canon) : (r.category ?? null);
    return {
      id: String(r.id),
      title: r.title,
      description: r.description ?? null,
      starts_at: safeISO(r.starts_at)!,
      ends_at: safeISO(r.ends_at),
      category: normalized, // ← normalized to catalog (or null)
      location_name: r.location_name ?? null,
      city: r.city ?? null,
      address: r.address ?? null,
      ticket_url: r.ticket_url ?? null,
      image_url: r.image_url ?? null,
      created_at: safeISO(r.created_at),
      all_day: r.all_day ?? null,
      age: r.age ?? null,
      organizer_email: r.organizer_email ?? null,
      source: "db",
    };
  });
}

async function loadCsvEvents(csvPath: string, fromISO: string, toISO: string, category?: string, city?: string, allAges?: boolean, canon?: Map<string, string>): Promise<EventRow[]> {
  let rows: string[][] = [];
  try {
    const raw = await readFile(csvPath, "utf8");
    rows = parseCsv(raw);
  } catch {
    return [];
  }
  if (rows.length < 2) return [];

  const header = rows[0].map(h => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const out: EventRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];

    const title = r[idx("title")] || r[idx("name")] || r[idx("event_title")] || "";
    const starts_at = safeISO(r[idx("starts_at")] || r[idx("start")] || r[idx("start_time")] || r[idx("start_datetime")]);
    if (!title || !starts_at) continue;

    const ends_at = safeISO(r[idx("ends_at")] || r[idx("end")] || r[idx("end_time")] || r[idx("end_datetime")]);
    const rawCat = r[idx("category")] || r[idx("type")] || "";
    const normalized = canon ? normalizeCategory(rawCat, canon) : (rawCat || null);

    // Apply filters (category is checked against normalized catalog name)
    const cityVal = (r[idx("city")] || "").trim() || null;
    if (city && cityVal !== city) continue;
    if (category && normalized !== category) continue;

    // date range on starts_at
    const ts = new Date(starts_at).getTime();
    if (ts < new Date(fromISO).getTime() || ts > new Date(toISO).getTime()) continue;

    const all_day = boolFrom(r[idx("all_day")] || r[idx("is_all_day")]);
    const age = r[idx("age")] || null;
    if (allAges && age && !/^all ages$/i.test(age)) {
      // if filtering for All ages, skip when age is present and not "All ages"
      continue;
    }

    out.push({
      id: `csv-${i}`,
      title,
      description: r[idx("description")] || r[idx("details")] || null,
      starts_at,
      ends_at,
      category: normalized, // ← normalized to catalog (or null)
      location_name: r[idx("location_name")] || r[idx("venue")] || r[idx("location")] || null,
      city: cityVal,
      address: r[idx("address")] || null,
      ticket_url: r[idx("ticket_url")] || r[idx("source_url")] || r[idx("url")] || null,
      image_url: r[idx("image_url")] || null,
      created_at: null,
      all_day,
      age,
      organizer_email: r[idx("organizer_email")] || r[idx("organizer")] || null,
      source: "csv",
    });
  }
  return out;
}

/* -------------------------------- route --------------------------------- */
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
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    // 1) load catalog and build canonical map
    const { list: catalogList, canon } = await loadCatalog();

    // If caller passed a category, only accept it if it’s in the catalog
    const normalizedFilter = category
      ? (canon.get(category.toLowerCase()) ?? "__INVALID__")
      : null;
    if (normalizedFilter === "__INVALID__") {
      // Return empty set if filtering by a non-catalog category
      return new Response(JSON.stringify({ items: [] }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    // 2) fetch from DB
    const dbItems = await loadDbEvents(from, to, normalizedFilter ?? undefined, city ?? undefined, allAges, canon);

    // 3) fetch from CSV
    const csvPath = path.join(process.cwd(), "public", "events.csv");
    const csvItems = await loadCsvEvents(csvPath, from, to, normalizedFilter ?? undefined, city ?? undefined, allAges, canon);

    // 4) union + sort
    const items: EventRow[] = [...dbItems, ...csvItems].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );

    // 5) Done
    return new Response(JSON.stringify({ items, catalog: catalogList }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "failed" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
