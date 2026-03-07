"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GoogleMap from "./GoogleMap";

type Pin = {
  id: string;
  slug: string;
  title: string;
  starts_at: string | null;
  ends_at?: string | null;
  category?: string | null;
  latitude: number;
  longitude: number;
};

type UserLocation = {
  lat: number;
  lng: number;
};

type DateFilter = "all" | "today" | "weekend";

const LISBON_DATE_TIME = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Europe/Lisbon",
});

const LISBON_PARTS = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  timeZone: "Europe/Lisbon",
});

function formatLisbonDateTime(dt: string | null | undefined) {
  if (!dt) return "";
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? String(dt) : LISBON_DATE_TIME.format(d);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(a: UserLocation, b: { latitude: number; longitude: number }) {
  const R = 6371;
  const dLat = toRadians(b.latitude - a.lat);
  const dLng = toRadians(b.longitude - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.latitude);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

function getLisbonDateInfo(input: Date | string) {
  const d = typeof input === "string" ? new Date(input) : input;
  const parts = LISBON_PARTS.formatToParts(d);

  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";

  return {
    key: `${year}-${month}-${day}`,
    weekday,
  };
}

function addDaysToKey(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  const yyyy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getWeekendKeysFromNow() {
  const nowInfo = getLisbonDateInfo(new Date());
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const currentDow = weekdayMap[nowInfo.weekday] ?? 0;

  if (currentDow === 6) return [nowInfo.key, addDaysToKey(nowInfo.key, 1)];
  if (currentDow === 0) return [addDaysToKey(nowInfo.key, -1), nowInfo.key];

  const daysUntilSaturday = 6 - currentDow;
  const saturdayKey = addDaysToKey(nowInfo.key, daysUntilSaturday);
  const sundayKey = addDaysToKey(saturdayKey, 1);
  return [saturdayKey, sundayKey];
}

function matchesDateFilter(startsAt: string | null | undefined, filter: DateFilter) {
  if (!startsAt) return false;
  if (filter === "all") return true;

  const eventInfo = getLisbonDateInfo(startsAt);
  const todayKey = getLisbonDateInfo(new Date()).key;

  if (filter === "today") return eventInfo.key === todayKey;

  const weekendKeys = getWeekendKeysFromNow();
  return weekendKeys.includes(eventInfo.key);
}

function FilterChip(props: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { active, onClick, children } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-sm font-medium transition",
        active
          ? "border-orange-300 bg-orange-50 text-[#c94917]"
          : "border-gray-200 bg-white text-gray-700 hover:bg-orange-50 hover:text-[#c94917]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function MapPage() {
  const router = useRouter();

  const [category, setCategory] = React.useState<string>("all");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("all");
  const [pins, setPins] = React.useState<Pin[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const [userLocation, setUserLocation] = React.useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = React.useState<string | null>(null);
  const [isLocating, setIsLocating] = React.useState<boolean>(false);
  const [centerToken, setCenterToken] = React.useState<number>(0);
  const [radiusKm, setRadiusKm] = React.useState<string>("all");

  async function loadPins(nextCategory: string) {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (nextCategory && nextCategory !== "all") qs.set("category", nextCategory);
      const res = await fetch(`/api/events/map-pins/?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load pins");
      setPins(json?.pins ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load pins");
      setPins([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadPins(category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSelectCategory(next: string) {
    setCategory(next);
    loadPins(next);
  }

  function goToPin(pin: Pin) {
    router.push(`/events/${encodeURIComponent(pin.slug)}`);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported in this browser.");
      return;
    }

    setIsLocating(true);
    setLocationStatus("Getting your location…");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setCenterToken((n) => n + 1);
        setIsLocating(false);
        setLocationStatus("Showing events near you.");
      },
      (err) => {
        let message = "Unable to get your location.";
        if (err?.code === 1) message = "Location permission was denied.";
        if (err?.code === 2) message = "Your location is unavailable.";
        if (err?.code === 3) message = "Location request timed out.";
        setIsLocating(false);
        setLocationStatus(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 }
    );
  }

  const visiblePins = React.useMemo(() => {
    let next = pins.filter((p) => matchesDateFilter(p.starts_at, dateFilter));

    if (userLocation) {
      next.sort((a, b) => distanceKm(userLocation, a) - distanceKm(userLocation, b));

      if (radiusKm !== "all") {
        const radius = Number(radiusKm);
        if (Number.isFinite(radius) && radius > 0) {
          next = next.filter((p) => distanceKm(userLocation, p) <= radius);
        }
      }
    }

    return next;
  }, [pins, userLocation, radiusKm, dateFilter]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Map</h1>
      <p className="text-sm text-gray-700 mb-6">
        Lisbon-only map view of approved future events with coordinates.
      </p>

      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold">Category</label>
          <select
            className="border rounded-md px-2 py-1 bg-white"
            value={category}
            onChange={(e) => onSelectCategory(e.target.value)}
          >
            <option value="all">All</option>
            <option value="Music">Music</option>
            <option value="Nightlife">Nightlife</option>
            <option value="Food & Drink">Food & Drink</option>
            <option value="Market">Market</option>
            <option value="Exhibition">Exhibition</option>
            <option value="Comedy">Comedy</option>
            <option value="Dance">Dance</option>
            <option value="Lecture">Lecture</option>
            <option value="Workshop">Workshop</option>
            <option value="Outdoor">Outdoor</option>
            <option value="Sports">Sports</option>
            <option value="Theater">Theater</option>
            <option value="Cinema">Cinema</option>
            <option value="Arts">Arts</option>
          </select>

          <button
            className="border rounded-md px-3 py-1 bg-white hover:bg-orange-50 disabled:opacity-60"
            onClick={useMyLocation}
            disabled={isLocating}
          >
            {isLocating ? "Locating…" : userLocation ? "Re-center near me" : "Use my location"}
          </button>

          <label className="text-sm font-semibold">Distance</label>
          <select
            className="border rounded-md px-2 py-1 bg-white disabled:opacity-60"
            value={radiusKm}
            onChange={(e) => setRadiusKm(e.target.value)}
            disabled={!userLocation}
          >
            <option value="all">All</option>
            <option value="2">Within 2 km</option>
            <option value="5">Within 5 km</option>
            <option value="10">Within 10 km</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold mr-1">When</span>
          <FilterChip active={dateFilter === "all"} onClick={() => setDateFilter("all")}>
            All upcoming
          </FilterChip>
          <FilterChip active={dateFilter === "today"} onClick={() => setDateFilter("today")}>
            Today
          </FilterChip>
          <FilterChip active={dateFilter === "weekend"} onClick={() => setDateFilter("weekend")}>
            This weekend
          </FilterChip>
        </div>

        {locationStatus && <div className="text-sm text-gray-600">{locationStatus}</div>}
      </div>

      {error && (
        <div className="mb-4 border border-red-200 bg-red-50 text-red-700 rounded-md p-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-xl bg-white p-4">
          <h2 className="text-lg font-semibold mb-2">
            Events {loading ? "" : `(${visiblePins.length})`}
          </h2>

          {!userLocation && (
            <div className="mb-3 text-xs text-gray-500">
              Use your location to sort events by distance and filter nearby options.
            </div>
          )}

          {loading ? (
            <div className="text-sm text-gray-600">Loading pins…</div>
          ) : visiblePins.length === 0 ? (
            <div className="text-sm text-gray-600">
              {userLocation && radiusKm !== "all"
                ? "No events found within that distance."
                : "No events match the current filters."}
            </div>
          ) : (
            <ul className="space-y-3">
              {visiblePins.map((p) => {
                const km = userLocation ? distanceKm(userLocation, p) : null;

                return (
                  <li key={p.id} className="flex items-start justify-between gap-3">
                    <button
                      className="text-left hover:underline"
                      onClick={() => goToPin(p)}
                      title="View details"
                    >
                      <div className="font-semibold">{p.title}</div>
                      <div className="text-xs text-gray-600">
                        {formatLisbonDateTime(p.starts_at)}
                        {p.category ? ` • ${p.category}` : ""}
                        {km !== null ? ` • ${formatDistance(km)}` : ""}
                      </div>
                    </button>

                    <Link className="text-sm underline" href={`/events/${encodeURIComponent(p.slug)}`}>
                      View
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border rounded-xl bg-white p-4">
          <h2 className="text-lg font-semibold mb-2">Map view</h2>
          <GoogleMap
            pins={visiblePins}
            onPinClick={goToPin}
            userLocation={userLocation}
            centerToken={centerToken}
          />
          <div className="text-xs text-gray-500 mt-2">
            Pins load from <code>/api/events/map-pins</code>. Click a marker to open{" "}
            <code>/events/[slug]</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
