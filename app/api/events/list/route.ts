import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const AUDIENCE_ALL = "All Ages";
const AUDIENCE_EXPANDED = ["All Ages", "Family", "Kids", "Teens", "Adults"];

function parseLimit(v?: string | null) {
  const n = Number(v || 500);
  if (!Number.isFinite(n) || n <= 0) return 500;
  return Math.min(n, 2000);
}

function toISODate(v?: string | null) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseEqParam(v?: string | null) {
  if (!v) return null;
  if (v.startsWith("eq.")) return v.slice(3);
  return v;
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
  return age === "all ages" || age === "all ages " || age === "all-ages";
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const nowISO = new Date().toISOString();
  const from = toISODate(url.searchParams.get("from"));
  const to = toISODate(url.searchParams.get("to"));
  const category = url.searchParams.get("category");
  const city = url.searchParams.get("city");
  const allAges = url.searchParams.get("all_ages");
  const limit = parseLimit(url.searchParams.get("limit"));

  const titleEq = parseEqParam(url.searchParams.get("title"));
  const startsAtEq = parseEqParam(url.searchParams.get("starts_at"));
  const locationNameEq = parseEqParam(url.searchParams.get("location_name"));
  const slugEq = parseEqParam(url.searchParams.get("slug"));

  const hasExactMatchFilters = !!(titleEq || startsAtEq || locationNameEq || slugEq);

  const supabase = supabaseServer();

  let query = supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (titleEq) query = query.eq("title", titleEq);
  if (startsAtEq) query = query.eq("starts_at", startsAtEq);
  if (locationNameEq) query = query.eq("location_name", locationNameEq);
  if (slugEq) query = query.eq("slug", slugEq);

  if (category) query = query.eq("category", category);
  if (city) query = query.eq("city", city);

  if (!hasExactMatchFilters) {
    query = query.or(`ends_at.gte.${nowISO},and(ends_at.is.null,starts_at.gte.${nowISO})`);

    if (from) {
      query = query.gte("ends_at", from);
    }

    if (to) {
      query = query.lte("starts_at", to);
    }
  } else {
    if (from) query = query.gte("starts_at", from);
    if (to) query = query.lte("starts_at", to);
  }

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

  if (allAges === "true") {
    items = items.filter(isAllAgesRow);
  }

  return new Response(JSON.stringify({ items, limit, source: "events" }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
