import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function supabaseProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  // https://<ref>.supabase.co
  try {
    const host = new URL(url).host;
    return host.split(".")[0] || "unknown";
  } catch {
    return "unknown";
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const limitParam = url.searchParams.get("limit");
    const debug = url.searchParams.get("debug") === "1";
    const probeId = url.searchParams.get("probeId"); // optional: check a specific row

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
          "geocoded_at",
          "normalized_address",
        ].join(",")
      )
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(Math.max(limit, 500));

    if (category) q = q.eq("category", category);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }

    const rows = data ?? [];

    const isFuture = (r: any) => r.starts_at && String(r.starts_at) >= nowIso;
    const hasLatLng = (r: any) => r.latitude != null && r.longitude != null;
    const hasSlug = (r: any) => typeof r.slug === "string" && r.slug.trim().length > 0;

    const future = rows.filter(isFuture);
    const futureWithLatLng = future.filter(hasLatLng);
    const futureWithSlug = future.filter(hasSlug);
    const pins = future.filter((r) => hasLatLng(r) && hasSlug(r)).slice(0, limit);

    if (!debug) {
      return NextResponse.json({ ok: true, pins }, { headers: { "Cache-Control": "no-store" } });
    }

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
        geocoded_at: r.geocoded_at,
        normalized_address: r.normalized_address,
      }));

    // Optional: directly probe a specific id from THIS route's perspective
    let probe: any = null;
    if (probeId) {
      const { data: pr, error: pe } = await supabase
        .from("events")
        .select("id,latitude,longitude,geocode_status,geocode_error,geocoded_at,normalized_address")
        .eq("id", probeId)
        .limit(1);
      probe = pe ? { error: pe.message } : pr?.[0] ?? null;
    }

    return NextResponse.json(
      {
        ok: true,
        debug: {
          nowIso,
          supabase_project_ref: supabaseProjectRef(),
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
          probe,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
