import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * Public endpoint: lightweight set of map pins for approved future events.
 *
 * Debug mode: /api/events/map-pins/?debug=1
 * Returns counts and sample rows so we can see why pins are empty.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const limitParam = url.searchParams.get("limit");
    const debug = url.searchParams.get("debug") === "1";

    let limit = 500;
    if (limitParam) {
      const n = Number(limitParam);
      if (!Number.isNaN(n) && n > 0) limit = Math.min(n, 2000);
    }

    const supabase = supabaseServer();
    const nowIso = new Date().toISOString();

    // Pull rows without lat/lng filtering so we can explain what's missing.
    let q = supabase
      .from("events")
      .select(
        [
          "id",
          "slug",
          "title",
          "starts_at",
          "category",
          "latitude",
          "longitude",
          "geocode_status",
          "geocode_error",
        ].join(",")
      )
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(Math.max(limit, 500));

    if (category) q = q.eq("category", category);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data ?? [];

    const isFuture = (r: any) => r.starts_at && String(r.starts_at) >= nowIso;
    const hasLatLng = (r: any) => r.latitude != null && r.longitude != null;
    const hasSlug = (r: any) => typeof r.slug === "string" && r.slug.trim().length > 0;

    const future = rows.filter(isFuture);
    const futureWithLatLng = future.filter(hasLatLng);
    const futureWithSlug = future.filter(hasSlug);
    const pins = future.filter((r) => hasLatLng(r) && hasSlug(r)).slice(0, limit);

    if (!debug) return NextResponse.json({ ok: true, pins });

    const sample = (arr: any[]) =>
      arr.slice(0, 8).map((r) => ({
        id: r.id,
        title: r.title,
        starts_at: r.starts_at,
        slug: r.slug,
        latitude: r.latitude,
        longitude: r.longitude,
        geocode_status: r.geocode_status,
        geocode_error: r.geocode_error,
      }));

    return NextResponse.json({
      ok: true,
      debug: {
        nowIso,
        total_rows_loaded: rows.length,
        counts: {
          future: future.length,
          future_with_latlng: futureWithLatLng.length,
          future_with_slug: futureWithSlug.length,
          future_with_latlng_and_slug: pins.length,
        },
        samples: {
          future: sample(future),
          future_missing_latlng: sample(future.filter((r) => !hasLatLng(r))),
          future_missing_slug: sample(future.filter((r) => !hasSlug(r))),
        },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
