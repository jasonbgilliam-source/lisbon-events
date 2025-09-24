// app/api/events/facets/route.ts
import { supabaseServer } from "../../../../lib/supabaseServer";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// very small CSV parser (same as combined route but simplified)
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
    const cats = new Set<string>();
    const cities = new Set<string>();

    // 1) DB facets
    const supabase = supabaseServer();
    const { data: dbRows, error } = await supabase.from("events").select("category,city");
    if (error) throw new Error(error.message);
    for (const r of dbRows || []) {
      if (r.category) cats.add(String(r.category));
      if (r.city) cities.add(String(r.city));
    }

    // 2) CSV facets
    try {
      const p = path.join(process.cwd(), "public", "events.csv");
      const raw = await readFile(p, "utf8");
      const rows = parseCsv(raw);
      const header = rows[0]?.map(h => h.trim().toLowerCase()) ?? [];
      const cIdx = header.indexOf("category");
      const cityIdx = header.indexOf("city");
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r) continue;
        const c = (r[cIdx] || "").trim();
        const ci = (r[cityIdx] || "").trim();
        if (c) cats.add(c);
        if (ci) cities.add(ci);
      }
    } catch (err) {
      // ok if CSV is missing
      console.warn("CSV facets read failed:", (err as any)?.message || err);
    }

    const out = {
      categories: Array.from(cats).filter(Boolean).sort((a, b) => a.localeCompare(b)),
      cities: Array.from(cities).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    };

    return new Response(JSON.stringify(out), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
