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

function formatLisbonDateTime(dt: string | null | undefined) {
  if (!dt) return "";
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? String(dt) : LISBON_DATE_TIME.format(d);
}

export default function MapPage() {
  const router = useRouter();

  const [category, setCategory] = React.useState<string>("all");
  const [pins, setPins] = React.useState<Pin[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Map</h1>
      <p className="text-sm text-gray-700 mb-6">
        Lisbon-only map view (pins come from approved future events with lat/lng).
      </p>

      <div className="flex items-center gap-3 mb-4">
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
          className="ml-2 border rounded-md px-3 py-1 bg-white hover:bg-orange-50"
          onClick={() => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(
              () => {},
              () => {},
              { enableHighAccuracy: false, timeout: 8000 }
            );
          }}
        >
          Use my location
        </button>
      </div>

      {error && (
        <div className="mb-4 border border-red-200 bg-red-50 text-red-700 rounded-md p-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-xl bg-white p-4">
          <h2 className="text-lg font-semibold mb-2">
            Events {loading ? "" : `(${pins.length})`}
          </h2>

          {loading ? (
            <div className="text-sm text-gray-600">Loading pins…</div>
          ) : pins.length === 0 ? (
            <div className="text-sm text-gray-600">
              No pins found. (You need approved future events with lat/lng and a slug.)
            </div>
          ) : (
            <ul className="space-y-2">
              {pins.map((p) => (
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
                    </div>
                  </button>

                  <Link className="text-sm underline" href={`/events/${encodeURIComponent(p.slug)}`}>
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border rounded-xl bg-white p-4">
          <h2 className="text-lg font-semibold mb-2">Map view</h2>
          <GoogleMap pins={pins} onPinClick={goToPin} />
          <div className="text-xs text-gray-500 mt-2">
            Pins loaded from <code>/api/events/map-pins</code>. Click a marker to open <code>/events/[slug]</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
