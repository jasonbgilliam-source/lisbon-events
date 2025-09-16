// app/api/submissions/approve/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { mapSubmissionToEvent } from "@/lib/submissionMapper";
import { appendRowToCsv, toCsvRow } from "@/lib/githubCsv";

export async function POST(req: Request) {
  try {
    const { id, reviewer, notes } = await req.json() as { id: number | string; reviewer?: string; notes?: string };

    if (!id) {
      return NextResponse.json({ error: "Missing submission id" }, { status: 400 });
    }

    const supabase = supabaseServer();

    // 1) Fetch submission
    const { data: sub, error: fetchErr } = await supabase
      .from("event_submissions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !sub) {
      return NextResponse.json({ error: fetchErr?.message || "Submission not found" }, { status: 404 });
    }
    if (sub.status && sub.status !== "pending") {
      return NextResponse.json({ error: `Submission already ${sub.status}` }, { status: 400 });
    }

    // 2) Map to events shape
    const eventRow = mapSubmissionToEvent(sub);
    if (!eventRow.title || !eventRow.start) {
      return NextResponse.json({ error: "Mapped row missing required fields (title/start)" }, { status: 400 });
    }

    // 3) Upsert into events table
    const { error: upsertErr } = await supabase
      .from("events")
      .upsert([eventRow], { onConflict: "title,start,venue" }); // match your unique index

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    // 4) Append to CSV in GitHub (optional but recommended)
    try {
      const row = toCsvRow(eventRow);
      await appendRowToCsv(row, `chore(events): approve submission #${id} -> ${eventRow.title}`);
    } catch (csvErr: any) {
      // Non-fatal: we still mark approved but include warning
      console.warn("CSV append failed:", csvErr?.message || csvErr);
    }

    // 5) Mark submission as approved
    const { error: updateErr } = await supabase
      .from("event_submissions")
      .update({
        status: "approved",
        reviewer: reviewer ?? null,
        review_notes: notes ?? null,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
