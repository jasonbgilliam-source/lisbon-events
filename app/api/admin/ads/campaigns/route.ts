import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(_req: NextRequest) {
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("id, name, active, advertisers ( id, name )")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("campaigns list error:", error);
    return NextResponse.json({ ok: false, error: "Query failed" }, { status: 500 });
  }

  const items = (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    active: c.active,
    advertiser_id: c.advertisers?.id || null,
    advertiser_name: c.advertisers?.name || null,
  }));

  return NextResponse.json({ ok: true, items });
}