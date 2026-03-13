
"use client";

import React from "react";

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  city?: string | null;
};

const LISBON_LAT = 38.7223;
const LISBON_LNG = -9.1393;

function buildGoogleMapsSearchUrl(
  latitude?: number | null,
  longitude?: number | null,
  location_name?: string | null,
  city?: string | null
) {
  if (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${latitude},${longitude}`
    )}`;
  }

  const query = [location_name || "", city || ""].join(" ").trim() || "Lisbon";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildEmbedUrl(
  latitude?: number | null,
  longitude?: number | null,
  location_name?: string | null,
  city?: string | null
) {
  if (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
  ) {
    return `https://www.google.com/maps?q=${encodeURIComponent(
      `${latitude},${longitude}`
    )}&z=14&output=embed`;
  }

  const query = [location_name || "", city || ""].join(" ").trim() || "Lisbon";
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`;
}

export default function EventStaticMap({
  latitude,
  longitude,
  location_name,
  city,
}: Props) {
  const lat =
    typeof latitude === "number" && Number.isFinite(latitude)
      ? latitude
      : LISBON_LAT;

  const lng =
    typeof longitude === "number" && Number.isFinite(longitude)
      ? longitude
      : LISBON_LNG;

  const mapsSearch = buildGoogleMapsSearchUrl(latitude, longitude, location_name, city);
  const embedUrl = buildEmbedUrl(lat, lng, location_name, city);

  return (
    <div>
      <div className="mb-2 text-xs font-semibold text-gray-600">
        Location
      </div>

      <a
        href={mapsSearch}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-lg border hover:opacity-95"
        aria-label="Open location in Google Maps"
      >
        <div className="relative h-48 w-full bg-gray-100">
          <iframe
            src={embedUrl}
            title="Event location map"
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </a>

      <div className="mt-1 text-xs text-gray-500">
        Click map to open in Google Maps
      </div>
    </div>
  );
}
