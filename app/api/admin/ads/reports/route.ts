import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function parseDateParam(s: string | null) {
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

type DailyRow = {
  day: string;
  slot_key: string;
  event_slug: string;
  metric: string;
  total: number;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const from = parseDateParam(searchParams.get("from"));
  const to = parseDateParam(searchParams.get("to"));

  let query = supabase
    .from("ad_metrics_daily")
    .select("day, slot_key, event_slug, metric, total");

  if (from) query = query.gte("day", `${from}T00:00:00Z`);

  if (to) {
    const end = new Date(`${to}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    query = query.lt("day", end.toISOString());
  }

  const { data, error } = await query.order("day", { ascending: false });

  if (error) {
    console.error("ads/reports query error:", error);
    return NextResponse.json({ ok: false, error: "Query failed" }, { status: 500 });
  }

  const rows = (data || []) as DailyRow[];

  // totals
  const totals: Record<string, number> = {};
  for (const r of rows) {
    totals[r.metric] = (totals[r.metric] || 0) + (r.total || 0);
  }

  // ----- Enrichment: event titles -----
  const uniqueSlugs = Array.from(new Set(rows.map((r) => r.event_slug).filter(Boolean)));

  const eventTitleBySlug = new Map<string, string>();
  if (uniqueSlugs.length > 0) {
    const { data: events, error: evErr } = await supabase
      .from("events")
      .select("slug, title")
      .in("slug", uniqueSlugs);

    if (evErr) {
      console.error("ads/reports events lookup error:", evErr);
    } else {
      for (const e of events || []) {
        if (e?.slug) eventTitleBySlug.set(e.slug, e.title || "");
      }
    }
  }

  // ----- Enrichment: placement -> campaign -> advertiser -----
  // We match placements by (slot_key, event_slug). This will be null for ENV-only ads.
  type PlacementJoin = {
    slot_key: string;
    event_slug: string;
    ad_campaigns?: {
      name: string;
      advertisers?: { name: string };
    } | null;
  };

  const placementByKey = new Map<string, { campaign_name?: string; advertiser_name?: string }>();

  if (uniqueSlugs.length > 0) {
    const uniqueSlotKeys = Array.from(new Set(rows.map((r) => r.slot_key).filter(Boolean)));

    const { data: placements, error: plErr } = await supabase
      .from("ad_placements")
      .select(
        `
        slot_key,
        event_slug,
        ad_campaigns (
          name,
          advertisers ( name )
        )
      `
      )
      .in("event_slug", uniqueSlugs)
      .in("slot_key", uniqueSlotKeys);

    if (plErr) {
      console.error("ads/reports placements lookup error:", plErr);
    } else {
      for (const p of (placements || []) as any as PlacementJoin[]) {
        const key = `${p.slot_key}::${p.event_slug}`;
        const campaign_name = p.ad_campaigns?.name || undefined;
        const advertiser_name = p.ad_campaigns?.advertisers?.name || undefined;
        placementByKey.set(key, { campaign_name, advertiser_name });
      }
    }
  }

  const enrichedRows = rows.map((r) => {
    const key = `${r.slot_key}::${r.event_slug}`;
    const placement = placementByKey.get(key);
    return {
      ...r,
      event_title: eventTitleBySlug.get(r.event_slug) || null,
      campaign_name: placement?.campaign_name || null,
      advertiser_name: placement?.advertiser_name || null,
    };
  });

  return NextResponse.json({
    ok: true,
    from,
    to,
    totals,
    rows: enrichedRows,
  });
}