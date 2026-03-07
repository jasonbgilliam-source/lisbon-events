"use client";

import * as React from "react";
import Link from "next/link";
import GoogleMap from "@/app/map/GoogleMap";
import { getFavoriteSlugs, removeFavorite, subscribeFavorites } from "@/lib/favorites";

type EventItem = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  location_name?: string | null;
  address?: string | null;
  city?: string | null;
  price?: string | null;
  category?: string | null;
};

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

function formatLisbonDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : LISBON_DATE_TIME.format(d);
}

function sortByStart(a?: string | null, b?: string | null) {
  const at = a ? new Date(a).getTime() : Number.POSITIVE_INFINITY;
  const bt = b ? new Date(b).getTime() : Number.POSITIVE_INFINITY;
  return at - bt;
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

export default function FavoritesPage() {
  const [favoriteSlugs, setFavoriteSlugs] = React.useState<string[]>([]);
  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [pins, setPins] = React.useState<Pin[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("all");

  React.useEffect(() => {
    function syncFavorites() {
      setFavoriteSlugs(getFavoriteSlugs());
    }

    syncFavorites();
    return subscribeFavorites(syncFavorites);
  }, []);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [eventsRes, pinsRes] = await Promise.all([
          fetch("/api/events/list/?limit=2000", { cache: "no-store" }),
          fetch("/api/events/map-pins/", { cache: "no-store" }),
        ]);

        const eventsJson = await eventsRes.json().catch(() => ({}));
        const pinsJson = await pinsRes.json().catch(() => ({}));

        if (!eventsRes.ok) {
          throw new Error(eventsJson?.error || `Failed to load events (${eventsRes.status})`);
        }

        if (!pinsRes.ok) {
          throw new Error(pinsJson?.error || `Failed to load map pins (${pinsRes.status})`);
        }

        setEvents(Array.isArray(eventsJson?.items) ? eventsJson.items : []);
        setPins(Array.isArray(pinsJson?.pins) ? pinsJson.pins : []);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load favorites.");
        setEvents([]);
        setPins([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const favoriteEvents = React.useMemo(() => {
    if (favoriteSlugs.length === 0 || events.length === 0) return [];
    const bySlug = new Map(events.map((e) => [e.slug, e]));
    return favoriteSlugs
      .map((slug) => bySlug.get(slug))
      .filter(Boolean)
      .filter((e) => matchesDateFilter(e?.starts_at, dateFilter))
      .sort((a, b) => sortByStart(a?.starts_at, b?.starts_at)) as EventItem[];
  }, [favoriteSlugs, events, dateFilter]);

  const favoritePins = React.useMemo(() => {
    if (favoriteSlugs.length === 0 || pins.length === 0) return [];
    const allowed = new Set(favoriteSlugs);
    return pins
      .filter((p) => allowed.has(p.slug))
      .filter((p) => matchesDateFilter(p.starts_at, dateFilter))
      .sort((a, b) => sortByStart(a.starts_at, b.starts_at));
  }, [favoriteSlugs, pins, dateFilter]);

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Favorites</h1>
        <p className="mt-2 text-sm text-gray-700">
          Save events you like, then come back here to see them together.
        </p>
        <p className="mt-1 text-xs text-gray-500">Saved on this device</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
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

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading favorites…</p>
      ) : favoriteSlugs.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#c94917]">No favorites yet</h2>
          <p className="mt-2 text-sm text-gray-700">
            Tap the heart on any event to save it here.
          </p>
          <div className="mt-4">
            <Link href="/events" className="text-[#c94917] underline">
              Browse events
            </Link>
          </div>
        </div>
      ) : favoriteEvents.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#c94917]">No favorites match that time filter</h2>
          <p className="mt-2 text-sm text-gray-700">
            Try switching from Today or This weekend back to All upcoming.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                Saved events ({favoriteEvents.length})
              </h2>
              <Link href="/events" className="text-sm text-[#c94917] underline">
                Browse more
              </Link>
            </div>

            <ul className="space-y-3">
              {favoriteEvents.map((event) => (
                <li
                  key={event.slug}
                  className="flex items-start justify-between gap-4 rounded-xl border border-orange-100 p-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/events/${encodeURIComponent(event.slug)}`}
                      className="font-semibold text-[#c94917] hover:underline"
                    >
                      {event.title}
                    </Link>

                    <div className="mt-1 text-sm text-gray-700">
                      {event.location_name || "Location TBA"}
                    </div>

                    <div className="mt-1 text-xs text-gray-600">
                      {formatLisbonDateTime(event.starts_at)}
                      {event.category ? ` • ${event.category}` : ""}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFavorite(event.slug)}
                    className="shrink-0 rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-orange-50 hover:text-[#c94917]"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Map of favorites</h2>

            {favoritePins.length > 0 ? (
              <>
                <GoogleMap
                  pins={favoritePins}
                  onPinClick={(pin) => {
                    window.location.href = `/events/${encodeURIComponent(pin.slug)}`;
                  }}
                />
                <div className="mt-2 text-xs text-gray-500">
                  Only saved events with coordinates appear on the map.
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-gray-600">
                No saved events with coordinates match the current time filter.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
