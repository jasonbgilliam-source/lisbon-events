import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Body =
  | { id: string; active: boolean }
  | { id: string; weight: number };

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const id = (body as any)?.id;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const patch: Record<string, any> = {};

  if (typeof (body as any).active === "boolean") patch.active = (body as any).active;
  if (typeof (body as any).weight === "number") patch.weight = (body as any).weight;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, error: "Nothing to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("ad_placements")
    .update(patch)
    .eq("id", id)
    .select("id, slot_key, event_slug, weight, active, start_date, end_date")
    .maybeSingle();

  if (error) {
    console.error("placements update error:", error);
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}