import { requireAdmin, requireCsrf } from "@/lib/adminAuth";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { buildLisbonGeocodeQuery, geocodeLisbonWithCache } from "@/lib/geocoding";

type EventForm = {
  title: string;
  start: string;
  end?: string;
  all_day?: boolean | string;
  venue?: string;
  city?: string;
  address?: string;
  category?: string;
  description?: string;
  age?: string;
  ticket_url?: string;
  image_url?: string;
  organizer_email?: string;
  youtube_url?: string;
  spotify_url?: string;
};

function toBool(v: unknown) {
  if (typeof v === "boolean") return v;
  if (v == null) return false;
  return String(v).trim().toLowerCase() === "true";
}

function toIsoOrThrow(s: string) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${s}`);
  return d.toISOString();
}

function cleanString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const csrfDenied = requireCsrf(req);
  if (csrfDenied) return csrfDenied;

  try {
    const body = (await req.json()) as Partial<EventForm>;

    if (!body?.title || !body?.start) {
      return NextResponse.json({ error: "title and start are required" }, { status: 400 });
    }

    const starts_at = toIsoOrThrow(body.start);
    const ends_at = toIsoOrThrow(body.end ?? body.start);
    const all_day = toBool(body.all_day);

    const supabase = supabaseServer();

    const title = cleanString(body.title);
    const description = cleanString(body.description);
    const category = cleanString(body.category);
    const location_name = cleanString(body.venue);
    const city = cleanString(body.city);
    const address = cleanString(body.address);
    const ticket_url = cleanString(body.ticket_url);
    const image_url = cleanString(body.image_url);
    const age = cleanString(body.age);
    const organizer_email = cleanString(body.organizer_email);
    const youtube_url = cleanString(body.youtube_url);
    const spotify_url = cleanString(body.spotify_url);

    const { data: inserted, error: insertErr } = await supabase
      .from("events")
      .insert([
        {
          title,
          description,
          starts_at,
          ends_at,
          category,
          location_name,
          city,
          address,
          ticket_url,
          image_url,
          all_day,
          age,
          organizer_email,
          youtube_url,
          spotify_url,
          geocode_status: "unprocessed",
        },
      ])
      .select("id,title")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    const eventId = inserted?.id;
    if (!eventId) {
      return NextResponse.json({ error: "Event insert failed" }, { status: 500 });
    }

    const baseTitle =
      typeof inserted?.title === "string" && inserted.title.trim().length > 0
        ? inserted.title
        : title || "event";

    const slug = `${eventId}-${slugify(baseTitle)}`;

    const { error: slugErr } = await supabase.from("events").update({ slug }).eq("id", eventId);
    if (slugErr) {
      return NextResponse.json({ error: slugErr.message }, { status: 500 });
    }

    const geocodeQuery = buildLisbonGeocodeQuery({
      locationName: location_name,
      address,
      city,
    });

    const geo = await geocodeLisbonWithCache({
      supabase,
      inputText: geocodeQuery,
    });

    if (geo.ok) {
      const { error: geoUpdateErr } = await supabase
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

      if (geoUpdateErr) {
        return NextResponse.json(
          {
            ok: true,
            eventId,
            slug,
            geocoded: false,
            warning: `Event created, but geocode update failed: ${geoUpdateErr.message}`,
          },
          { status: 200 }
        );
      }

      return NextResponse.json({
        ok: true,
        eventId,
        slug,
        geocoded: true,
      });
    }

    const failMessage =
      "error" in geo && typeof (geo as any).error === "string"
        ? (geo as any).error
        : "Geocoding failed";

    const { error: failUpdateErr } = await supabase
      .from("events")
      .update({
        geocode_provider: "google",
        geocode_confidence: 0,
        geocode_status: "failed",
        geocode_error: failMessage,
        geocoded_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    if (failUpdateErr) {
      return NextResponse.json(
        {
          ok: true,
          eventId,
          slug,
          geocoded: false,
          warning: `Event created, geocoding failed, and failure status update also failed: ${failUpdateErr.message}`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      eventId,
      slug,
      geocoded: false,
      error: failMessage,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
