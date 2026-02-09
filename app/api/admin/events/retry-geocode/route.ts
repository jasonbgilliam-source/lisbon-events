import { requireAdmin, requireCsrf } from "@/lib/adminAuth";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { buildLisbonGeocodeQuery, geocodeLisbonWithCache } from "@/lib/geocoding";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeString(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const csrfDenied = requireCsrf(req);
  if (csrfDenied) return csrfDenied;

  try {
    const body = await req.json().catch(() => ({}));
    const id = safeString(body?.id);

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Fetch event fields needed for geocoding
    const { data: rows, error: fetchErr } = await supabase
      .from("events")
      .select("id,location_name,address,city")
      .eq("id", id)
      .limit(1);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    const ev = rows?.[0];
    if (!ev) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const geocodeQuery = buildLisbonGeocodeQuery({
      locationName: safeString(ev.location_name),
      address: safeString(ev.address),
      city: safeString(ev.city),
    });

    const geo = await geocodeLisbonWithCache({
      supabase,
      inputText: geocodeQuery,
    });

    if (geo.ok) {
      const { error: upOkErr } = await supabase
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
        .eq("id", id);

      if (upOkErr) {
        return NextResponse.json({ error: upOkErr.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, geocoded: true });
    }

    // ✅ IMPORTANT: Type-safe access to an error message on the "fail" shape
    const failMessage =
      "error" in geo && typeof (geo as any).error === "string"
        ? (geo as any).error
        : "Geocoding failed";

    const { error: upFailErr } = await supabase
      .from("events")
      .update({
        geocode_provider: "google",
        geocode_confidence: 0,
        geocode_status: "failed",
        geocode_error: failMessage,
        geocoded_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (upFailErr) {
      return NextResponse.json({ error: upFailErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, geocoded: false, error: failMessage });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}