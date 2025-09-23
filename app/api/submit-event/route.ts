// app/api/submit-event/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

function toIso(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Required by your event_submissions schema
    const title = (body.title || "").trim();
    const description = (body.description || "").trim();
    const location_name = (body.location_name || "").trim();
    const organizer_email = (body.organizer_email || "").trim();
    const starts_at = toIso(body.starts_at || body.start);

    if (!title || !description || !location_name || !organizer_email || !starts_at) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ends_at = toIso(body.ends_at || body.end);
    const all_day =
      String(body.all_day ?? "").toLowerCase() === "true" || body.all_day === true;

    const { error } = await supabaseServer()
      .from("event_submissions")
      .insert([{
        title,
        description,
        starts_at,
        ends_at,
        location_name,
        address: body.address ?? null,
        ticket_url: body.ticket_url ?? null,
        image_url: body.image_url ?? null,
        organizer_email,
        age: body.age ?? null,
        city: body.city ?? null, // DB default 'Lisboa' will apply if null
        all_day,
        category: body.category ?? null
      }]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
