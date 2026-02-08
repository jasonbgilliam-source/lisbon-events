import { NextResponse } from "next/server";
import { requireAdmin, requireCsrf } from "@/lib/adminAuth";
import { supabaseServer } from "@/lib/supabaseServer";
import { buildLisbonGeocodeQuery, geocodeLisbonWithCache } from "@/lib/geocoding";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const csrfDenied = requireCsrf(req);
  if (csrfDenied) return csrfDenied;

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = supabaseServer();

    const { data: rows, error: fetchErr } = await supabase
      .from("events")
      .select("id,title,location_name,address,city")
      .eq("id", id)
      .limit(1);

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

    const ev = rows?.[0];
    if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const inputText = buildLisbonGeocodeQuery({
      locationName: ev.location_name ?? null,
      address: ev.address ?? null,
      city: ev.city ?? null,
    });

    const geo = await geocodeLisbonWithCache({ supabase, inputText });

    if (!geo.ok) {
      // Persist failure, but *also* return the reason clearly
      const { data: updated, error: upErr } = await supabase
        .from("events")
        .update({
          geocode_provider: "google",
          geocode_confidence: 0,
          geocode_status: "failed",
          geocode_error: geo.error,
          geocoded_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id,latitude,longitude,geocode_status,geocode_error")
        .maybeSingle();

      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

      return NextResponse.json({
        ok: true,
        geocoded: false,
        provider_error: geo.error,
        updated_row: updated ?? null,
        note: "Geocoding provider returned an error; event row updated to failed status.",
      });
    }

    // Success: write lat/lng + metadata and RETURN the updated row
    const { data: updated, error: upErr } = await supabase
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
      .eq("id", id)
      .select("id,latitude,longitude,geocode_status,geocode_error,normalized_address")
      .maybeSingle();

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    if (!updated) {
      // This means update affected 0 rows (RLS or wrong id type mismatch)
      return NextResponse.json(
        {
          error: "Update returned no row (0 rows updated). Likely RLS or permission issue in supabaseServer().",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, geocoded: true, updated_row: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
