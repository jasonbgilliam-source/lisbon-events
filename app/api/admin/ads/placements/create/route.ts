import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Body = {
  campaign_id: string;
  slot_key: string;
  event_slug: string;
  weight?: number;
  active?: boolean;
  start_date?: string | null; // YYYY-MM-DD
  end_date?: string | null;   // YYYY-MM-DD
};

function isISODate(s: any) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const campaign_id = body.campaign_id;
  const slot_key = (body.slot_key || "").trim();
  const event_slug = (body.event_slug || "").trim();

  if (!campaign_id || !slot_key || !event_slug) {
    return NextResponse.json(
      { ok: false, error: "Missing campaign_id, slot_key, or event_slug" },
      { status: 400 }
    );
  }

  const weight = Number.isFinite(body.weight as any) ? Number(body.weight) : 100;
  const active = typeof body.active === "boolean" ? body.active : true;

  const start_date = body.start_date ? (isISODate(body.start_date) ? body.start_date : null) : null;
  const end_date = body.end_date ? (isISODate(body.end_date) ? body.end_date : null) : null;

  // Guard: ensure event exists
  const { data: ev, error: evErr } = await supabase
    .from("events")
    .select("slug")
    .eq("slug", event_slug)
    .maybeSingle();

  if (evErr) {
    console.error("placement create event check error:", evErr);
    return NextResponse.json({ ok: false, error: "Event check failed" }, { status: 500 });
  }
  if (!ev) {
    return NextResponse.json({ ok: false, error: "Event slug not found in events" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ad_placements")
    .insert({
      campaign_id,
      slot_key,
      event_slug,
      weight,
      active,
      start_date,
      end_date,
    })
    .select("id, slot_key, event_slug, weight, active, start_date, end_date, created_at")
    .maybeSingle();

  if (error) {
    console.error("placement create error:", error);
    return NextResponse.json({ ok: false, error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}