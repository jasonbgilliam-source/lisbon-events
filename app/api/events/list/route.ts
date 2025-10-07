// app/api/events/list/route.ts
import { supabaseServer } from "../../../../lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toISODate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
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
  if (allAges === "true") {
    // consider null or "All ages" as all-ages; adjust if you use a different convention
    query = query.or('age.is.null,age.eq."All ages"');
  }

  const { data, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ items: data ?? [] }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
