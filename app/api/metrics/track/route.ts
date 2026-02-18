cat << 'EOF' > app/api/metrics/track/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  metric?: "impression" | "click";
  event_slug?: string;
  page_path?: string;
  referrer?: string | null;
  user_agent?: string | null;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const metric = body.metric;
    const event_slug = body.event_slug;
    const page_path = body.page_path;

    if (metric !== "impression" && metric !== "click") {
      return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
    }
    if (!event_slug || typeof event_slug !== "string") {
      return NextResponse.json({ error: "Missing event_slug" }, { status: 400 });
    }
    if (!page_path || typeof page_path !== "string") {
      return NextResponse.json({ error: "Missing page_path" }, { status: 400 });
    }

    const referrer =
      typeof body.referrer === "string" ? body.referrer : req.headers.get("referer");
    const user_agent =
      typeof body.user_agent === "string" ? body.user_agent : req.headers.get("user-agent");

    const supabase = getSupabaseAdmin();

    // Explicit fallback: if env isn't set, don't crash the app.
    if (!supabase) {
      console.log("[metrics.track] (no supabase env) ", {
        metric,
        event_slug,
        page_path,
        referrer,
        user_agent,
      });
      return NextResponse.json({ ok: true, stored: false });
    }

    const { error } = await supabase.from("sponsor_metrics").insert({
      metric,
      event_slug,
      page_path,
      referrer,
      user_agent,
    });

    if (error) {
      console.error("[metrics.track] supabase insert error:", error);
      return NextResponse.json({ error: "Failed to store metric" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, stored: true });
  } catch (e: any) {
    console.error("[metrics.track] error:", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}