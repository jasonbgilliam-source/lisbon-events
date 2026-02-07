import { requireAdmin, requireCsrf } from "@/lib/adminAuth";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { mapSubmissionToEvent } from "@/lib/submissionMapper";
import { buildLisbonGeocodeQuery, geocodeLisbonWithCache } from "@/lib/geocoding";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const csrfDenied = requireCsrf(req);
  if (csrfDenied) return csrfDenied;

  try {
    const { id, reviewer, notes } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = supabaseServer();

    // 1) Fetch submission
    const { data: rows, error: fetchErr } = await supabase
      .from("event_submissions")
      .select("*")
      .eq("id", id)
      .limit(1);

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

    const sub = rows?.[0];
    if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    // 2) Map submission -> event payload
    const ev = mapSubmissionToEvent(sub);

    // 3) Insert into events (return inserted id so we can update geocode fields)
    const { data: inserted, error: insErr } = await supabase
      .from("events")
      .insert([
        {
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

          // Optional: set defaults for geocode status columns if you added them
          geocode_status: "unprocessed",
        },
      ])
      .select("id")
      .single();

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    const eventId = inserted?.id;
    if (!eventId) return NextResponse.json({ error: "Event insert failed" }, { status: 500 });

    // 4) Geocode (non-blocking)
    const geocodeQuery = buildLisbonGeocodeQuery({
      locationName: ev.location_name ?? null,
      address: ev.address ?? null,
      city: ev.city ?? null,
    });

    const geo = await geocodeLisbonWithCache({
      supabase,
      inputText: geocodeQuery,
    });

    if (geo.ok) {
      // Update event with lat/lng
      await supabase
        .from("events")
        .update({
          latitude: geo.latitude,
          longitude: geo.longitude,
          normalized_address: geo.normalizedAddress,
          geocode_provider: "google",
          geocode_confidence: geo.confidence,
          geocode_status: "success",
          geocode_error: null,
          geocoded_at: new Date().toISOString(),
        })
        .eq("id", eventId);
    } else {
      // Don't block approval; just mark failed
      await supabase
        .from("events")
        .update({
          geocode_provider: "google",
          geocode_confidence: 0,
          geocode_status: "failed",
          geocode_error: geo.error,
          geocoded_at: new Date().toISOString(),
        })
        .eq("id", eventId);
    }

    // 5) Mark submission approved
    const { error: upErr } = await supabase
      .from("event_submissions")
      .update({
        status: "approved",
        reviewer,
        review_notes: notes ?? null,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, eventId, geocoded: geo.ok });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
