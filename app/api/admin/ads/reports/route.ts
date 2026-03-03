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

  const rows = data || [];

  const totals: Record<string, number> = {};
  for (const r of rows as any[]) {
    totals[r.metric] = (totals[r.metric] || 0) + (r.total || 0);
  }

  return NextResponse.json({ ok: true, from, to, totals, rows });
}