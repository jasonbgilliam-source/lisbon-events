import crypto from "crypto";

export type GeocodeOk = {
  ok: true;
  inputText: string;
  inputHash: string;
  latitude: number;
  longitude: number;
  normalizedAddress: string | null;
  providerPlaceId: string | null;
  locationType: string | null;
  confidence: number; // 0-100
  fromCache: boolean;
};

export type GeocodeFail = {
  ok: false;
  inputText: string;
  inputHash: string;
  error: string;
  fromCache: boolean;
};

export type GeocodeResult = GeocodeOk | GeocodeFail;

function sha256(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function normalizeWhitespace(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Deterministic Lisbon-biased query builder.
 */
export function buildLisbonGeocodeQuery(args: {
  locationName?: string | null;
  address?: string | null;
  city?: string | null;
}): string {
  const parts: string[] = [];

  const loc = args.locationName ? normalizeWhitespace(args.locationName) : "";
  const addr = args.address ? normalizeWhitespace(args.address) : "";
  const city = args.city ? normalizeWhitespace(args.city) : "";

  if (loc) parts.push(loc);
  if (addr) parts.push(addr);

  parts.push(city || "Lisboa");
  parts.push("Portugal");

  return parts.join(", ");
}

function confidenceFromLocationType(locationType?: string | null): number {
  switch (locationType) {
    case "ROOFTOP":
      return 95;
    case "RANGE_INTERPOLATED":
      return 85;
    case "GEOMETRIC_CENTER":
      return 70;
    case "APPROXIMATE":
      return 55;
    default:
      return 50;
  }
}

/**
 * Cache is best-effort: cache failures never break the flow.
 * Requires Google key in process.env.GOOGLE_MAPS_API_KEY.
 */
export async function geocodeLisbonWithCache(params: {
  supabase: any;
  inputText: string;
}): Promise<GeocodeResult> {
  const inputText = normalizeWhitespace(params.inputText);
  const inputHash = sha256(inputText);

  // 1) Cache lookup (best-effort)
  try {
    const { data: cached, error: cacheErr } = await params.supabase
      .from("geocode_cache")
      .select(
        "normalized_address,latitude,longitude,provider_place_id,location_type,confidence"
      )
      .eq("input_hash", inputHash)
      .maybeSingle();

    if (!cacheErr && cached?.latitude != null && cached?.longitude != null) {
      return {
        ok: true,
        inputText,
        inputHash,
        latitude: cached.latitude,
        longitude: cached.longitude,
        normalizedAddress: cached.normalized_address ?? null,
        providerPlaceId: cached.provider_place_id ?? null,
        locationType: cached.location_type ?? null,
        confidence:
          cached.confidence ?? confidenceFromLocationType(cached.location_type ?? null),
        fromCache: true,
      };
    }
  } catch {
    // ignore cache issues
  }

  // 2) Provider call
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return {
      ok: false,
      inputText,
      inputHash,
      error: "Missing GOOGLE_MAPS_API_KEY",
      fromCache: false,
    };
  }

  // Rough Lisbon bounds (SW|NE)
  const bounds = "38.6900,-9.2300|38.7800,-9.0900";

  const url =
    "https://maps.googleapis.com/maps/api/geocode/json" +
    `?address=${encodeURIComponent(inputText)}` +
    `&bounds=${encodeURIComponent(bounds)}` +
    `&region=pt` +
    `&key=${encodeURIComponent(key)}`;

  let json: any;
  try {
    const res = await fetch(url, { method: "GET" });
    json = await res.json();
  } catch (e: any) {
    return {
      ok: false,
      inputText,
      inputHash,
      error: `Geocode fetch failed: ${e?.message || "unknown error"}`,
      fromCache: false,
    };
  }

  if (!json || json.status !== "OK" || !Array.isArray(json.results) || json.results.length === 0) {
    // Best-effort cache record (optional)
    try {
      await params.supabase.from("geocode_cache").upsert(
        {
          input_text: inputText,
          input_hash: inputHash,
          provider: "google",
          confidence: 0,
          raw_response: json ?? null,
        },
        { onConflict: "input_hash" }
      );
    } catch {}

    return {
      ok: false,
      inputText,
      inputHash,
      error: `Geocode failed: ${json?.status || "UNKNOWN"}`,
      fromCache: false,
    };
  }

  const top = json.results[0];
  const loc = top?.geometry?.location;
  const locationType: string | null = top?.geometry?.location_type ?? null;

  if (loc?.lat == null || loc?.lng == null) {
    return {
      ok: false,
      inputText,
      inputHash,
      error: "Geocode returned no lat/lng",
      fromCache: false,
    };
  }

  const confidence = confidenceFromLocationType(locationType);

  // 3) Cache write (best-effort)
  try {
    await params.supabase.from("geocode_cache").upsert(
      {
        input_text: inputText,
        input_hash: inputHash,
        normalized_address: top?.formatted_address ?? null,
        latitude: loc.lat,
        longitude: loc.lng,
        provider: "google",
        provider_place_id: top?.place_id ?? null,
        location_type: locationType,
        confidence,
        raw_response: json,
      },
      { onConflict: "input_hash" }
    );
  } catch {}

  return {
    ok: true,
    inputText,
    inputHash,
    latitude: loc.lat,
    longitude: loc.lng,
    normalizedAddress: top?.formatted_address ?? null,
    providerPlaceId: top?.place_id ?? null,
    locationType,
    confidence,
    fromCache: false,
  };
}
