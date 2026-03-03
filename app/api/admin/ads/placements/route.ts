import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slot_key = searchParams.get("slot_key"); // optional filter

  let q = supabase
    .from("ad_placements")
    .select(
      `
      id,
      slot_key,
      event_slug,
      weight,
      active,
      start_date,
      end_date,
      created_at,
      ad_campaigns (
        id,
        name,
        active,
        advertisers ( id, name )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (slot_key) q = q.eq("slot_key", slot_key);

  const { data, error } = await q;

  if (error) {
    console.error("placements list error:", error);
    return NextResponse.json({ ok: false, error: "Query failed" }, { status: 500 });
  }

  // Enrich with event title for human readability
  const rows = (data || []) as any[];
  const slugs = Array.from(new Set(rows.map((r) => r.event_slug).filter(Boolean)));

  const titleBySlug = new Map<string, string>();
  if (slugs.length) {
    const { data: events, error: evErr } = await supabase
      .from("events")
      .select("slug, title")
      .in("slug", slugs);

    if (evErr) {
      console.error("placements events lookup error:", evErr);
    } else {
      for (const e of events || []) {
        if (e?.slug) titleBySlug.set(e.slug, e.title || "");
      }
    }
  }

  const enriched = rows.map((r) => ({
    ...r,
    event_title: titleBySlug.get(r.event_slug) || null,
    advertiser_name: r?.ad_campaigns?.advertisers?.name || null,
    campaign_name: r?.ad_campaigns?.name || null,
    campaign_active: r?.ad_campaigns?.active ?? null,
  }));

  return NextResponse.json({ ok: true, items: enriched });
}