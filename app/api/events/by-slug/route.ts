import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("events")
    .select("id, slug, title, starts_at, ends_at, location_name, city, image_url, price")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("by-slug error:", error);
    return NextResponse.json({ ok: false, error: "Query failed" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: data });
}
