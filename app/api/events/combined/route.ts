// app/api/events/combined/route.ts
import { supabaseServer } from "../../../../lib/supabaseServer";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EventRow = {
  id: string; // generated UUID or derived key for CSV
  title: string;
  description: string | null;
  starts_at: string;   // ISO
  ends_at: string | null;
  category: string | null;
  location_name: string | null;
  city: string | null;
  address: string | null;
  ticket_url: string | null;
  image_url: string | null;
  all_day: boolean | null;
  age: string | null;
  organizer_email: string | null;
  _source: "db" | "csv"; // to know where it came from (optional, useful for debugging)
};

/* --------------------------- helpers --------------------------- */
function toISO(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toBoolLoose(v: any): boolean | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return null;
}

// tiny CSV parser that supports quotes and commas inside quotes
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0, field = "", row: string[] = [], inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; } // escaped quote
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
  // last field
  row.push(field);
  rows.push(row);
  // remove trailing blank rows
  return rows.filter(r => r.some(cell => cell !== ""));
}

function csvToEvents(rows: string[][]): EventRow[] {
  if (rows.length === 0) return [];
  const header = rows[0].map(h => h.trim().toLowerCase());
  const getIdx = (name: string) => header.indexOf(name);
  const idx = {
    title: getIdx("title"),
    description: getIdx("description"),
    starts_at: getIdx("starts_at"),
    ends_at: getIdx("ends_at"),
    category: getIdx("category"),
    location_name: getIdx("location_name"),
    city: getIdx("city"),
    address: getIdx("address"),
    ticket_url: getIdx("ticket_url"),
    image_url: getIdx("image_url"),
    all_day: getIdx("all_day"),
    age: getIdx("age"),
    organizer_email: getIdx("organizer_email"),
  };

  const out: EventRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    const title = row[idx.title] || "";
    const starts_at = toISO(row[idx.starts_at] || "") || new Date().toISOString();
    const ends_at = toISO(row[idx.ends_at] || "");
    const all_day = toBoolLoose(row[idx.all_day]);

    const ev: EventRow = {
      id: `csv-${r}-${starts_at}`, // deterministic-ish
      title,
      description: row[idx.description] || null,
      starts_at,
      ends_at,
      category: row[idx.category] || null,
      location_name: row[idx.location_name] || null,
      city: row[idx.city] || null,
      address: row[idx.address] || null,
      ticket_url: row[idx.ticket_url] || null,
      image_url: row[idx.image_url] || null,
      all_day,
      age: row[idx.age] || null,
      organizer_email: row[idx.organizer_email] || null,
      _source: "csv",
    };
    out.push(ev);
  }
  return out;
}

function applyFilters(items: EventRow[], qs: URLSearchParams): EventRow[] {
  const from = toISO(qs.get("from")) || new Date().toISOString();
  const to = toISO(qs.get("to"));
  const category = (qs.get("category") || "").trim().toLowerCase();
  const city = (qs.get("city") || "").trim().toLowerCase();
  const allAges = (qs.get("all_ages") || "").toLowerCase() === "true";

  return items.filter(ev => {
    if (new Date(ev.starts_at).getTime() < new Date(from).getTime()) return false;
    if (to && new Date(ev.starts_at).getTime() > new Date(to).getTime()) return false;
    if (category && (ev.category || "").toLowerCase() !== category) return false;
    if (city && (ev.city || "").toLowerCase() !== city) return false;
    if (allAges) {
      const a = (ev.age || "").toLowerCase();
      if (a && a !== "all ages" && a !== "all-ages" && a !== "allages") return false;
    }
    return true;
  });
}

/* ----------------------------- route ----------------------------- */
export async function GET(req: Request) {
  try {
    const qs = new URL(req.url).searchParams;

    // 1) DB events
    const supabase = supabaseServer();
    const { data: dbRows, error } = await supabase
      .from("events")
      .select("*")
      .order("starts_at", { ascending: true });
    if (error) throw new Error(error.message);

    const dbEvents: EventRow[] = (dbRows || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description ?? null,
      starts_at: toISO(e.starts_at) || new Date().toISOString(),
      ends_at: toISO(e.ends_at),
      category: e.category ?? null,
      location_name: e.location_name ?? null,
      city: e.city ?? null,
      address: e.address ?? null,
      ticket_url: e.ticket_url ?? null,
      image_url: e.image_url ?? null,
      all_day: typeof e.all_day === "boolean" ? e.all_day : toBoolLoose(e.all_day),
      age: e.age ?? null,
      organizer_email: e.organizer_email ?? null,
      _source: "db",
    }));

    // 2) CSV events from public/events.csv
    let csvEvents: EventRow[] = [];
    try {
      const p = path.join(process.cwd(), "public", "events.csv");
      const raw = await readFile(p, "utf8");
      const rows = parseCsv(raw);
      csvEvents = csvToEvents(rows);
    } catch (err) {
      // If the CSV is missing, keep going with DB only
      console.warn("CSV read failed (ok to ignore if not using CSV):", (err as any)?.message || err);
      csvEvents = [];
    }

    // 3) merge + filter
    const merged = [...dbEvents, ...csvEvents].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );

    const filtered = applyFilters(merged, qs);

    return new Response(JSON.stringify({ items: filtered }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
