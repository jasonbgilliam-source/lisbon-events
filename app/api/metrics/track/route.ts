import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      metric,
      event_slug,
      page_path,
      referrer,
      user_agent,
      slot_key
    } = body;

    if (!metric || !event_slug) {
      return NextResponse.json(
        { ok: false, error: "Missing metric or event_slug" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("sponsor_metrics")
      .insert({
        metric,
        event_slug,
        page_path: page_path || null,
        referrer: referrer || null,
        user_agent: user_agent || null,
        slot_key: slot_key || "unknown"
      });

    if (error) {
      console.error("Metrics insert error:", error);
      return NextResponse.json(
        { ok: false, error: "Insert failed" },
        { status: 500 }
      );
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
