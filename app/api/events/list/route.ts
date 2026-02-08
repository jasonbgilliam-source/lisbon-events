// app/api/events/list/route.ts
import { supabaseServer } from "../../../../lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const AUDIENCE_ALL = "All Ages";
const AUDIENCE_EXPANDED = ["All Ages", "Family", "Kids", "Teens", "Adults"];

function toISODate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeAudienceForResponse(row: any): string[] {
  const aud = row?.audience;

  // If DB has a non-empty audience array, return it unchanged.
  if (Array.isArray(aud) && aud.length > 0) {
    return aud.map((x: any) => String(x));
  }

  // Legacy fallback: if no structured audience, treat as all-ages expanded
  return AUDIENCE_EXPANDED;
}

function isAllAgesRow(row: any): boolean {
  const aud = row?.audience;

  // ✅ Structured audience is authoritative if present
  if (Array.isArray(aud) && aud.length > 0) {
    return aud.some((x: any) => String(x).toLowerCase() === AUDIENCE_ALL.toLowerCase());
  }

  // Legacy fallback ONLY when audience missing/empty
  const age = String(row?.age ?? "").trim().toLowerCase();
  if (!age) return true; // legacy behavior: null/empty treated as all-ages
  return age === "all ages" || age === "all ages " || age === "all-ages";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = toISODate(url.searchParams.get("from")) ?? new Date().toISOString();
  const to = toISODate(url.searchParams.get("to"));
  const category = url.searchParams.get("category");
  const city = url.searchParams.get("city");
  const allAges = url.searchParams.get("all_ages"); // "true" to filter for all-ages

  const supabase = supabaseServer();
  let query = supabase
    .from("events")
    .select("*")
    .gte("starts_at", from)
    .order("starts_at", { ascending: true });

  if (to) query = query.lte("starts_at", to);
  if (category) query = query.eq("category", category);
  if (city) query = query.eq("city", city);

  const { data, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let items = (data ?? []).map((row: any) => ({
    ...row,
    audience: normalizeAudienceForResponse(row),
  }));

  // Optional "all ages" filtering (supports new audience[] + legacy age string)
  if (allAges === "true") {
    items = items.filter(isAllAgesRow);
  }

  return new Response(JSON.stringify({ items }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
