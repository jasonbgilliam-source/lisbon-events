import { seriesKey, lisbonDate, canceled } from "@/lib/eventSeries.mjs";
import { readAll } from "@/lib/eventOccurrences";
import { requireAdmin, requireCsrf } from "@/lib/adminAuth";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { mapSubmissionToEvent } from "@/lib/submissionMapper";
import { buildLisbonGeocodeQuery, geocodeLisbonWithCache } from "@/lib/geocoding";

export const dynamic = "force-dynamic";

const AUDIENCE_OPTIONS = ["All Ages", "Family", "Kids", "Teens", "Adults"] as const;
const AUDIENCE_DEFAULT_EXPANDED = ["All Ages", "Family", "Kids", "Teens", "Adults"];
const CITYWIDE_LABEL = "Various locations around Lisbon";
const LISBON_CENTER = {
  latitude: 38.7223,
  longitude: -9.1393,
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function stripOuterQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).trim();
  return t;
}

function tryParseJsonArrayString(s: string): string[] | null {
  const t = s.trim();
  if (!(t.startsWith("[") && t.endsWith("]"))) return null;
  try {
    const parsed = JSON.parse(t);
    if (Array.isArray(parsed)) return parsed.map((x) => String(x));
    return null;
  } catch {
    return null;
  }
}

function normalizeAudience(input: any): string[] | null {
  let arr: string[] = [];

  if (Array.isArray(input)) {
    arr = input.map((x) => String(x));
  } else if (typeof input === "string") {
    const parsed = tryParseJsonArrayString(input);
    if (parsed) {
      arr = parsed;
    } else {
      const s = input.trim();
      const stripped = s.startsWith("{") && s.endsWith("}") ? s.slice(1, -1) : s;
      arr = stripped.split(/[|,;/]+/g).map((x) => stripOuterQuotes(x));
    }
  } else if (input != null) {
    arr = [String(input)];
  }

  arr = arr
    .map((x) => stripOuterQuotes(String(x)))
    .map((x) => x.trim())
    .filter(Boolean);

  if (arr.length === 0) return null;

  const normalized = arr
    .map((s) => {
      const hit = AUDIENCE_OPTIONS.find((opt) => opt.toLowerCase() === s.toLowerCase());
      return hit ?? null;
    })
    .filter(Boolean) as string[];

  if (normalized.length === 0) return null;

  const hasAllAges = normalized.includes("All Ages");
  const expanded = hasAllAges ? AUDIENCE_DEFAULT_EXPANDED : normalized;

  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of expanded) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

function cleanString(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function cleanBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function applyOverrides(sub: any, overrides: any) {
  if (!overrides || typeof overrides !== "object") return sub;

  const isCitywide =
    overrides.is_citywide === undefined ? false : cleanBool(overrides.is_citywide);

  const nextLocationName =
    cleanString(overrides.location_name) ?? sub.location_name ?? null;

  return {
    ...sub,
    title: cleanString(overrides.title) ?? sub.title ?? null,
    description: cleanString(overrides.description) ?? sub.description ?? null,
    starts_at: cleanString(overrides.starts_at) ?? sub.starts_at ?? null,
    ends_at: cleanString(overrides.ends_at) ?? sub.ends_at ?? null,
    location_name: isCitywide
      ? nextLocationName || CITYWIDE_LABEL
      : nextLocationName,
    city: cleanString(overrides.city) ?? sub.city ?? null,
    address: isCitywide ? null : cleanString(overrides.address) ?? sub.address ?? null,
    category: cleanString(overrides.category) ?? sub.category ?? null,
    organizer_email: cleanString(overrides.organizer_email) ?? sub.organizer_email ?? null,
    ticket_url: cleanString(overrides.ticket_url) ?? sub.ticket_url ?? null,
    source_url: cleanString(overrides.source_url) ?? sub.source_url ?? null,
    image_url: cleanString(overrides.image_url) ?? sub.image_url ?? null,
    age: cleanString(overrides.age) ?? sub.age ?? null,
    youtube_url: cleanString(overrides.youtube_url) ?? sub.youtube_url ?? null,
    spotify_url: cleanString(overrides.spotify_url) ?? sub.spotify_url ?? null,
    all_day:
      overrides.all_day === undefined ? sub.all_day ?? false : cleanBool(overrides.all_day),
    audience:
      overrides.audience === undefined
        ? sub.audience ?? null
        : normalizeAudience(overrides.audience),
    is_citywide: isCitywide,
  };
}

function normalizeForCompare(v: any): string {
  return String(v ?? "").trim().toLowerCase();
}

function isUniqueConstraintError(err: any, constraintName: string) {
  const message = String(err?.message ?? "");
  const details = String(err?.details ?? "");
  const hint = String(err?.hint ?? "");
  const code = String(err?.code ?? "");
  return (
    code === "23505" ||
    message.includes(constraintName) ||
    details.includes(constraintName) ||
    hint.includes(constraintName)
  );
}

async function findExactDuplicates(params: {
  supabase: any;
  title: string;
  startsAt: string;
  locationName: string;
}) {
  const { data, error } = await params.supabase
    .from("events")
    .select("id,title,starts_at,location_name,slug")
    .eq("title", params.title)
    .eq("starts_at", params.startsAt)
    .eq("location_name", params.locationName)
    .limit(5);

  if (error) throw error;
  return data ?? [];
}

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const csrfDenied = requireCsrf(req);
  if (csrfDenied) return csrfDenied;

  try {
    const { id, reviewer, notes, overrides } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = supabaseServer();

    const { data: rows, error: fetchErr } = await supabase
      .from("event_submissions")
      .select("*")
      .eq("id", id)
      .limit(1);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    const sub = rows?.[0];
    if (!sub) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const reviewedSub = applyOverrides(sub, overrides);
    if (!reviewedSub.starts_at || Number.isNaN(Date.parse(reviewedSub.starts_at)) ||
      (reviewedSub.ends_at && (Number.isNaN(Date.parse(reviewedSub.ends_at)) || Date.parse(reviewedSub.ends_at) < Date.parse(reviewedSub.starts_at)))) {
      return NextResponse.json({ error: "A valid confirmed start and an end after the start are required" }, { status: 400 });
    }
    const isCitywide = !!reviewedSub.is_citywide;

    if (
      !cleanString(reviewedSub.title) ||
      !cleanString(reviewedSub.starts_at) ||
      !cleanString(reviewedSub.category) ||
      !cleanString(reviewedSub.city) ||
      !cleanString(reviewedSub.source_url)
    ) {
      return NextResponse.json(
        {
          error:
            "title, starts_at, category, city, and source_url are required before approval",
        },
        { status: 400 }
      );
    }

    if (!isCitywide) {
      if (!cleanString(reviewedSub.location_name) || !cleanString(reviewedSub.address)) {
        return NextResponse.json(
          {
            error:
              "location_name and address are required unless the event is marked citywide",
          },
          { status: 400 }
        );
      }
    }

    const normalizedAudience = normalizeAudience(reviewedSub.audience);
    const audienceSent = normalizedAudience ?? AUDIENCE_DEFAULT_EXPANDED;

    const ev = mapSubmissionToEvent(reviewedSub);

    const finalLocationName = isCitywide
      ? cleanString(ev.location_name) || CITYWIDE_LABEL
      : cleanString(ev.location_name);

    if (!finalLocationName) {
      return NextResponse.json(
        { error: "A venue/location name is required unless the event is marked citywide." },
        { status: 400 }
      );
    }

    if (canceled(sub)) return NextResponse.json({ error: "Canceled sessions cannot be approved" }, { status: 400 });
    const series = (await readAll("events")).filter((e: any) =>
      (!e.status || e.status === "approved") && !canceled(e) &&
      seriesKey(e) === seriesKey({ ...reviewedSub, location_name: finalLocationName })
    ).sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)) || a.id.localeCompare(b.id))[0];
    const storePerformance = async (slug: string) => {
      const { error } = await supabase.from("event_occurrences").upsert({
        event_slug: slug, occurrence_date: lisbonDate(ev.starts_at),
        starts_at: ev.starts_at, ends_at: ev.ends_at, is_all_day: ev.all_day,
      }, { onConflict: "event_slug,starts_at" });
      if (error) throw new Error(error.message);
    };
    const markReviewed = async () => {
      const { error: upErr } = await supabase
        .from("event_submissions")
        .update({
          title: reviewedSub.title ?? null,
          description: reviewedSub.description ?? null,
          starts_at: reviewedSub.starts_at ?? null,
          ends_at: reviewedSub.ends_at ?? null,
          location_name: reviewedSub.location_name ?? null,
          city: reviewedSub.city ?? null,
          address: reviewedSub.address ?? null,
          category: reviewedSub.category ?? null,
          organizer_email: reviewedSub.organizer_email ?? null,
          image_url: reviewedSub.image_url ?? null,
          ticket_url: reviewedSub.ticket_url ?? null,
          source_url: reviewedSub.source_url ?? null,
          all_day: reviewedSub.all_day ?? false,
          age: reviewedSub.age ?? null,
          audience: reviewedSub.audience ?? null,
          youtube_url: reviewedSub.youtube_url ?? null,
          spotify_url: reviewedSub.spotify_url ?? null,
          status: "approved",
          reviewer,
          review_notes: notes ?? null,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (upErr) throw new Error(upErr.message);
    };
    if (series?.slug) {
      // Legacy listing starts are confirmed performances too. Preserve them before
      // adding another date, so the old start never vanishes when rows appear.
      const { data: old, error: oldError } = await supabase.from("event_occurrences")
        .select("event_slug").eq("event_slug", series.slug).limit(1);
      if (oldError) throw new Error(oldError.message);
      if (!old?.length && series.starts_at) {
        const { error } = await supabase.from("event_occurrences").upsert({
          event_slug: series.slug, occurrence_date: lisbonDate(series.starts_at),
          starts_at: series.starts_at, ends_at: series.ends_at, is_all_day: series.all_day || false,
        }, { onConflict: "event_slug,starts_at" });
        if (error) throw new Error(error.message);
      }
      await storePerformance(series.slug);
      await markReviewed();
      return NextResponse.json({ ok: true, eventId: series.id, slug: series.slug, addedPerformance: true });
    }

    let inserted: { id: string; audience: any } | null = null;

    try {
      const insertResult = await supabase
        .from("events")
        .insert([
          {
            status: "approved",
            title: ev.title,
            description: ev.description,
            starts_at: ev.starts_at,
            ends_at: ev.ends_at,
            category: ev.category,
            location_name: finalLocationName,
            city: ev.city,
            address: isCitywide ? null : ev.address,
            ticket_url: ev.ticket_url,
            image_url: ev.image_url,
            all_day: ev.all_day,
            age: ev.age,
            audience: audienceSent,
            organizer_email: ev.organizer_email,
            youtube_url: ev.youtube_url,
            spotify_url: ev.spotify_url,
            source_url: reviewedSub.source_url ?? null,
            geocode_status: "unprocessed",
          },
        ])
        .select("id,audience")
        .single();

      if (insertResult.error) throw insertResult.error;
      inserted = insertResult.data;
    } catch (err: any) {
      if (isUniqueConstraintError(err, "events_dedupe")) {
        const retryDuplicates = await findExactDuplicates({
          supabase,
          title: ev.title,
          startsAt: ev.starts_at,
          locationName: finalLocationName,
        });

        return NextResponse.json(
          {
            error: "This event appears to already exist in the published events list.",
            code: "duplicate_event",
            duplicates: retryDuplicates,
          },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: err?.message ?? "Event insert failed" }, { status: 500 });
    }

    const eventId = inserted?.id;
    if (!eventId) {
      return NextResponse.json({ error: "Event insert failed" }, { status: 500 });
    }

    const audienceStored = inserted?.audience ?? null;

    const baseTitle =
      typeof ev.title === "string" && ev.title.trim().length > 0 ? ev.title : "event";
    const slug = `${eventId}-${slugify(baseTitle)}`;

    const { error: slugErr } = await supabase.from("events").update({ slug }).eq("id", eventId);
    if (slugErr) {
      await supabase.from("events").delete().eq("id", eventId);
      return NextResponse.json({ error: slugErr.message }, { status: 500 });
    }

    if (isCitywide) {
      const { error: citywideErr } = await supabase
        .from("events")
        .update({
          latitude: LISBON_CENTER.latitude,
          longitude: LISBON_CENTER.longitude,
          normalized_address: "Lisbon, Portugal",
          geocode_provider: "citywide-fallback",
          geocode_confidence: 0,
          geocode_status: "citywide",
          geocode_error: null,
          geocoded_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (citywideErr) {
        await supabase.from("events").delete().eq("id", eventId);
        return NextResponse.json({ error: citywideErr.message }, { status: 500 });
      }
    } else {
      const geocodeQuery = buildLisbonGeocodeQuery({
        locationName: ev.location_name ?? null,
        address: ev.address ?? null,
        city: ev.city ?? null,
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

        await supabase.from("events").delete().eq("id", eventId);

        return NextResponse.json(
          {
            error:
              `Could not geocode this event. Please refine the venue/address/city before approval. ${failMessage}`,
          },
          { status: 400 }
        );
      }

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
        await supabase.from("events").delete().eq("id", eventId);
        return NextResponse.json({ error: geoUpdateErr.message }, { status: 500 });
      }
    }

    try {
      await storePerformance(slug);
      await markReviewed();
    } catch (error) {
      await supabase.from("event_occurrences").delete().eq("event_slug", slug);
      await supabase.from("events").delete().eq("id", eventId);
      throw error;
    }

    return NextResponse.json({
      ok: true,
      eventId,
      slug,
      geocoded: !isCitywide,
      citywide: isCitywide,
      audience_submission_raw: reviewedSub.audience ?? null,
      audience_sent: audienceSent,
      audience_stored: audienceStored,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
