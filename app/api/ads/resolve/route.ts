import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Placement = {
  id: string;
  slot_key: string;
  event_slug: string;
  weight: number;
  start_date: string | null;
  end_date: string | null;
  ad_campaigns?: {
    name: string;
    active: boolean;
    advertisers?: { name: string } | null;
  } | null;
};

function todayISODateUTC() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isWithinWindow(p: Placement, today: string) {
  const startsOk = !p.start_date || p.start_date <= today;
  const endsOk = !p.end_date || p.end_date >= today;
  return startsOk && endsOk;
}

function weightedPick(items: Placement[]) {
  const pool = items
    .map((p) => ({ ...p, weight: Number(p.weight) || 0 }))
    .filter((p) => p.weight > 0);

  const total = pool.reduce((acc, p) => acc + p.weight, 0);
  if (pool.length === 0 || total <= 0) return null;

  let r = Math.random() * total;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return pool[pool.length - 1] || null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slot_key = searchParams.get("slot_key");

  if (!slot_key) {
    return NextResponse.json(
      { ok: false, error: "Missing slot_key" },
      { status: 400 }
    );
  }

  const today = todayISODateUTC();

  const { data, error } = await supabase
    .from("ad_placements")
    .select(
      `
      id,
      slot_key,
      event_slug,
      weight,
      start_date,
      end_date,
      ad_campaigns (
        name,
        active,
        advertisers ( name )
      )
    `
    )
    .eq("slot_key", slot_key)
    .eq("active", true);

  if (error) {
    console.error("ads/resolve query error:", error);
    return NextResponse.json({ ok: false, error: "Query failed" }, { status: 500 });
  }

  const placements = ((data || []) as any as Placement[])
    .filter((p) => p?.event_slug)
    .filter((p) => isWithinWindow(p, today))
    .filter((p) => (p.ad_campaigns?.active ?? true) === true);

  const picked = weightedPick(placements);

  if (!picked) {
    return NextResponse.json({ ok: true, picked: null, slot_key });
  }

  return NextResponse.json({
    ok: true,
    slot_key,
    picked: {
      id: picked.id,
      slot_key: picked.slot_key,
      event_slug: picked.event_slug,
      weight: picked.weight,
      advertiser_name: picked.ad_campaigns?.advertisers?.name || null,
      campaign_name: picked.ad_campaigns?.name || null,
    },
    candidates: placements.length,
  });
}