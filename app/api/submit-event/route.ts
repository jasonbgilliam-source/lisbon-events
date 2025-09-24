// app/api/submit-event/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";
import { readFile } from "fs/promises";
import path from "path";

function toIso(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Build the allow-list of categories from BOTH sources (DB + CSV). */
async function loadAllowedCategories(): Promise<Set<string>> {
  const cats = new Set<string>();

  // 1) DB categories
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase.from("events").select("category");
    if (error) throw error;
    for (const row of data || []) {
      if (row?.category) cats.add(String(row.category));
    }
  } catch (e) {
    console.warn("submit-event: failed to load DB categories:", (e as any)?.message || e);
  }

  // 2) CSV categories
  try {
    const p = path.join(process.cwd(), "public", "events.csv");
    const raw = await readFile(p, "utf8");
    const rows = parseCsv(raw);
    const header = rows[0]?.map(h => h.trim().toLowerCase()) ?? [];
    const idx = header.indexOf("category");
    if (idx >= 0) {
      for (let i = 1; i < rows.length; i++) {
        const v = (rows[i]?.[idx] || "").trim();
        if (v) cats.add(v);
      }
    }
  } catch (e) {
    // ok if CSV missing
    console.warn("submit-event: CSV categories unavailable:", (e as any)?.message || e);
  }

  return cats;
}

// tiny CSV parser supporting quotes
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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Required by your event_submissions schema
    const title = (body.title || "").trim();
    const description = (body.description || "").trim();
    const location_name = (body.location_name || "").trim();
    const organizer_email = (body.organizer_email || "").trim();
    const starts_at = toIso(body.starts_at || body.start);

    if (!title || !description || !location_name || !organizer_email || !starts_at) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ends_at = toIso(body.ends_at || body.end);
    const all_day =
      String(body.all_day ?? "").trim().toLowerCase() === "true" || body.all_day === true;

    // Category must be from the allowed picklist
    const category = (body.category ?? "").toString().trim();
    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    const allowed = await loadAllowedCategories();
    if (!allowed.has(category)) {
      return NextResponse.json({
        error: `Invalid category. Please select one from the list.`,
      }, { status: 400 });
    }

    // Normalize status (force pending)
    const status = "pending";

    const { error } = await supabaseServer()
      .from("event_submissions")
      .insert([{
        title,
        description,
        starts_at,
        ends_at,
        location_name,
        address: body.address ?? null,
        ticket_url: body.ticket_url ?? null,
        image_url: body.image_url ?? null,
        organizer_email,
        age: body.age ?? null,
        city: body.city ?? null, // DB default 'Lisboa' will apply if null
        all_day,
        category,
        status
      }]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
