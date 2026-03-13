import { requireAdmin, requireCsrf } from "@/lib/adminAuth";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { buildLisbonGeocodeQuery, geocodeLisbonWithCache } from "@/lib/geocoding";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CITYWIDE_LABEL = "Various locations around Lisbon";
const LISBON_CENTER = {
  latitude: 38.7223,
  longitude: -9.1393,
};

function cleanString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function cleanBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function toIsoOrNull(v: unknown): string | null {
  const s = cleanString(v);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: data });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const csrfDenied = requireCsrf(req);
  if (csrfDenied) return csrfDenied;

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const title = cleanString(body?.title);
    const description = cleanString(body?.description);
    const starts_at = toIsoOrNull(body?.starts_at);
    const ends_at = toIsoOrNull(body?.ends_at);
    const category = cleanString(body?.category);
    const city = cleanString(body?.city);
    const source_url = cleanString(body?.source_url);
    const ticket_url = cleanString(body?.ticket_url);
    const image_url = cleanString(body?.image_url);
    const organizer_email = cleanString(body?.organizer_email);
    const age = cleanString(body?.age);
    const audience = body?.audience ?? null;
    const youtube_url = cleanString(body?.youtube_url);
    const spotify_url = cleanString(body?.spotify_url);
    const all_day = cleanBool(body?.all_day);
    const is_citywide = cleanBool(body?.is_citywide);

    let location_name = cleanString(body?.location_name);
    let address = cleanString(body?.address);

    if (!title || !starts_at || !category || !city || !source_url) {
      return NextResponse.json(
        { error: "title, starts_at, category, city, and source_url are required" },
        { status: 400 }
      );
    }

    if (is_citywide) {
      location_name = location_name || CITYWIDE_LABEL;
      address = null;
    } else {
      if (!location_name || !address) {
        return NextResponse.json(
          { error: "location_name and address are required unless citywide is enabled" },
          { status: 400 }
        );
      }
    }

    const supabase = supabaseServer();

    const { data: existing, error: fetchErr } = await supabase
      .from("events")
      .select("id,title,slug")
      .eq("id", id)
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const nextSlug = `${id}-${slugify(title)}`;

    const updatePayload: Record<string, any> = {
      title,
      description,
      starts_at,
      ends_at: ends_at ?? starts_at,
      category,
      location_name,
      city,
      address,
      source_url,
      ticket_url,
      image_url,
      organizer_email,
      age,
      audience,
      youtube_url,
      spotify_url,
      all_day,
      slug: nextSlug,
    };

    if (is_citywide) {
      updatePayload.latitude = LISBON_CENTER.latitude;
      updatePayload.longitude = LISBON_CENTER.longitude;
      updatePayload.normalized_address = "Lisbon, Portugal";
      updatePayload.geocode_provider = "citywide-fallback";
      updatePayload.geocode_confidence = 0;
      updatePayload.geocode_status = "citywide";
      updatePayload.geocode_error = null;
      updatePayload.geocoded_at = new Date().toISOString();
    } else {
      const geocodeQuery = buildLisbonGeocodeQuery({
        locationName: location_name,
        address,
        city,
      });

      const geo = await geocodeLisbonWithCache({
        supabase,
        inputText: geocodeQuery,
      });

      if (!geo.ok) {
        const failMessage =
          "error" in geo && typeof (geo as any).error === "string"
            ? (geo as any).error
            : "Geocoding failed";

        return NextResponse.json(
          {
            error: `Could not geocode this event. Please refine the venue/address/city before saving. ${failMessage}`,
          },
          { status: 400 }
        );
      }

      updatePayload.latitude = geo.latitude;
      updatePayload.longitude = geo.longitude;
      updatePayload.normalized_address = geo.normalizedAddress;
      updatePayload.geocode_provider = "google";
      updatePayload.geocode_confidence = geo.confidence;
      updatePayload.geocode_status = "success";
      updatePayload.geocode_error = null;
      updatePayload.geocoded_at = new Date().toISOString();
    }

    const { error: updateErr } = await supabase
      .from("events")
      .update(updatePayload)
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      id,
      slug: nextSlug,
      citywide: is_citywide,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
