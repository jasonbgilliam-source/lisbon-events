import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ ok: true, items: [] });
  }

  // basic “search” without extensions:
  // - match slug ilike
  // - match title ilike
  // keep it small and fast
  const pattern = `%${q}%`;

  const { data, error } = await supabase
    .from("events")
    .select("slug, title, starts_at, location_name")
    .or(`slug.ilike.${pattern},title.ilike.${pattern}`)
    .order("starts_at", { ascending: false, nullsFirst: false })
    .limit(20);

  if (error) {
    console.error("events search error:", error);
    return NextResponse.json({ ok: false, error: "Query failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data || [] });
}