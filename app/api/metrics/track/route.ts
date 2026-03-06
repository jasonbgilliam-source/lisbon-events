import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function isoDateUTC(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      metric,
      event_slug,
      page_path,
      referrer,
      user_agent,
      slot_key,
      anon_id,
      campaign_id,
    } = body;

    if (!metric || !event_slug) {
      return NextResponse.json(
        { ok: false, error: "Missing metric or event_slug" },
        { status: 400 }
      );
    }

    const normalizedMetric =
      metric === "impression" || metric === "click" ? metric : null;

    const { error: insertErr } = await supabase.from("sponsor_metrics").insert({
      metric,
      event_slug,
      page_path: page_path || null,
      referrer: referrer || null,
      user_agent: user_agent || null,
      slot_key: slot_key || "unknown",
    });

    if (insertErr) {
      console.error("Metrics insert error:", insertErr);
      return NextResponse.json(
        { ok: false, error: "Insert failed" },
        { status: 500 }
      );
    }

    if (
      normalizedMetric &&
      typeof anon_id === "string" &&
      anon_id.length > 0 &&
      typeof campaign_id === "string" &&
      campaign_id.length > 0 &&
      typeof slot_key === "string" &&
      slot_key.length > 0
    ) {
      const today = isoDateUTC(new Date());

      const { error: bumpErr } = await supabase.rpc("ad_frequency_bump", {
        p_day: today,
        p_anon_id: anon_id,
        p_slot_key: slot_key,
        p_campaign_id: campaign_id,
        p_metric: normalizedMetric,
      });

      if (bumpErr) console.warn("Frequency bump failed:", bumpErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Metrics route error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
