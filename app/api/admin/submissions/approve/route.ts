// app/api/submissions/approve/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { mapSubmissionToEvent } from "@/lib/submissionMapper";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { id, reviewer, notes } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = supabaseServer();
    const { data: rows, error: fetchErr } = await supabase
      .from("event_submissions")
      .select("*")
      .eq("id", id)
      .limit(1);
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    const sub = rows?.[0];
    if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    const ev = mapSubmissionToEvent(sub);

    const { error: insErr } = await supabase.from("events").insert([{
      title: ev.title,
      description: ev.description,
      starts_at: ev.starts_at,
      ends_at: ev.ends_at,
      category: ev.category,
      location_name: ev.location_name,
      city: ev.city,
      address: ev.address,
      ticket_url: ev.ticket_url,
      image_url: ev.image_url,
      all_day: ev.all_day,
      age: ev.age,
      organizer_email: ev.organizer_email,
      youtube_url: ev.youtube_url,
      spotify_url: ev.spotify_url,
    }]);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    const { error: upErr } = await supabase
      .from("event_submissions")
      .update({ status: "approved", reviewer, review_notes: notes ?? null, approved_at: new Date().toISOString() })
      .eq("id", id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
