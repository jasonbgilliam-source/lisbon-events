// app/api/events/facets/route.ts
import { supabaseServer } from "@/lib/supabaseServer";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// mini CSV parser
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

export async function GET() {
  try {
    const supabase = supabaseServer();

    // Categories from catalog
    const { data: catRows, error: catErr } = await supabase
      .from("category_catalog")
      .select("name")
      .order("name");
    if (catErr) throw new Error(catErr.message);
    const categories = (catRows || []).map((r: any) => r.name);

    // Cities from DB + CSV
    const citiesSet = new Set<string>();
    const { data: dbRows, error: dbErr } = await supabase.from("events").select("city");
    if (dbErr) throw new Error(dbErr.message);
    for (const r of dbRows || []) {
      if (r?.city) citiesSet.add(String(r.city));
    }
    try {
      const p = path.join(process.cwd(), "public", "events.csv");
      const raw = await readFile(p, "utf8");
      const rows = parseCsv(raw);
      const header = rows[0]?.map(h => h.trim().toLowerCase()) ?? [];
      const cityIdx = header.indexOf("city");
      for (let i = 1; i < rows.length; i++) {
        const ci = (rows[i]?.[cityIdx] || "").trim();
        if (ci) citiesSet.add(ci);
      }
    } catch {}

    const cities = Array.from(citiesSet).sort((a, b) => a.localeCompare(b));

    return new Response(JSON.stringify({ categories, cities }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
