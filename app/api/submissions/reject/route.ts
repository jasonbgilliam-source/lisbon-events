// app/api/submissions/reject/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { id, reviewer, notes } = (await req.json()) as {
      id: string; reviewer?: string; notes?: string;
    };
    if (!id) return NextResponse.json({ error: "Missing submission id" }, { status: 400 });

    const supabase = supabaseServer();
    const { error } = await supabase
      .from("event_submissions")
      .update({
        status: "rejected",
        reviewer: reviewer ?? null,
        review_notes: notes ?? null,
      })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
