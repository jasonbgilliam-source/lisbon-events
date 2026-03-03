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

function pct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return n;
}

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

  // Enrichment: event titles
  const uniqueSlugs = Array.from(new Set(rows.map((r) => r.event_slug).filter(Boolean)));
  const eventTitleBySlug = new Map<string, string>();

  if (uniqueSlugs.length > 0) {
    const { data: events, error: evErr } = await supabase
      .from("events")
      .select("slug, title")
      .in("slug", uniqueSlugs);

    if (evErr) console.error("ads/reports events lookup error:", evErr);
    else {
      for (const e of events || []) {
        if (e?.slug) eventTitleBySlug.set(e.slug, e.title || "");
      }
    }
  }

  // Enrichment: placement -> campaign -> advertiser (match by slot_key + event_slug)
  const placementByKey = new Map<
    string,
    { campaign_name?: string; advertiser_name?: string }
  >();

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
      for (const p of (placements || []) as any[]) {
        const key = `${p.slot_key}::${p.event_slug}`;
        placementByKey.set(key, {
          campaign_name: p?.ad_campaigns?.name || undefined,
          advertiser_name: p?.ad_campaigns?.advertisers?.name || undefined,
        });
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

  // Build rollups for invoice-ready reporting
  const slotAgg = new Map<string, { impressions: number; clicks: number }>();
  const campAgg = new Map<string, { impressions: number; clicks: number }>();
  const advAgg = new Map<string, { impressions: number; clicks: number }>();

  for (const r of enrichedRows as any[]) {
    const impressionsAdd = r.metric === "impression" ? (r.total || 0) : 0;
    const clicksAdd = r.metric === "click" ? (r.total || 0) : 0;

    // Slot
    const sKey = r.slot_key || "unknown";
    const s = slotAgg.get(sKey) || { impressions: 0, clicks: 0 };
    s.impressions += impressionsAdd;
    s.clicks += clicksAdd;
    slotAgg.set(sKey, s);

    // Campaign
    const cKey = r.campaign_name || "—";
    const c = campAgg.get(cKey) || { impressions: 0, clicks: 0 };
    c.impressions += impressionsAdd;
    c.clicks += clicksAdd;
    campAgg.set(cKey, c);

    // Advertiser
    const aKey = r.advertiser_name || "—";
    const a = advAgg.get(aKey) || { impressions: 0, clicks: 0 };
    a.impressions += impressionsAdd;
    a.clicks += clicksAdd;
    advAgg.set(aKey, a);
  }

  const slot_summary = Array.from(slotAgg.entries()).map(([slot_key, v]) => ({
    slot_key,
    impressions: v.impressions,
    clicks: v.clicks,
    ctr: v.impressions > 0 ? pct(v.clicks / v.impressions) : 0,
  }));

  const campaign_summary = Array.from(campAgg.entries()).map(([campaign_name, v]) => ({
    campaign_name,
    impressions: v.impressions,
    clicks: v.clicks,
    ctr: v.impressions > 0 ? pct(v.clicks / v.impressions) : 0,
  }));

  const advertiser_summary = Array.from(advAgg.entries()).map(([advertiser_name, v]) => ({
    advertiser_name,
    impressions: v.impressions,
    clicks: v.clicks,
    ctr: v.impressions > 0 ? pct(v.clicks / v.impressions) : 0,
  }));

  // sort summaries by impressions desc
  slot_summary.sort((a, b) => b.impressions - a.impressions);
  campaign_summary.sort((a, b) => b.impressions - a.impressions);
  advertiser_summary.sort((a, b) => b.impressions - a.impressions);

  return NextResponse.json({
    ok: true,
    from,
    to,
    totals,
    rows: enrichedRows,
    slot_summary,
    campaign_summary,
    advertiser_summary,
  });
}