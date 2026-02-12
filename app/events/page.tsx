"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import dayjs from "dayjs";
import FilterBar from "@/components/FilterBar";
import EmptyState from "@/components/EmptyState";

/**
 * Sponsored placement control
 * Add slugs here to force top sponsored placement.
 */
const SPONSORED_EVENT_SLUGS = new Set<string>([
  // "your-sponsor-slug-here",
]);

type EventItem = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  starts_at?: string | null;
  location_name?: string | null;
  city?: string | null;
  price?: string | null;
  audience?: string[] | null;
  age?: string | null;
  category?: string | null;
  image_url?: string | null;
  source_folder?: string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  is_free?: boolean | null;
};

function pickEvents(json: any): EventItem[] {
  const arr =
    json?.events ??
    json?.data ??
    json?.items ??
    json?.rows ??
    (Array.isArray(json) ? json : null);

  return Array.isArray(arr) ? (arr as EventItem[]) : [];
}

function normalizeAudienceValue(input: string) {
  const s = String(input || "").trim().toLowerCase();
  if (!s) return "";
  if (s === "all ages" || s === "all-ages") return "all ages";
  if (s === "family") return "family";
  if (s === "kids" || s === "children") return "kids";
  if (s === "teens" || s === "teen") return "teens";
  if (s === "adults" || s === "adult") return "adults";
  return s;
}

function getAudienceKeys(e: EventItem): string[] {
  if (Array.isArray(e.audience) && e.audience.length > 0) {
    const keys = e.audience.map(normalizeAudienceValue).filter(Boolean);
    return keys.length > 0 ? keys : ["all ages"];
  }
  return ["all ages"];
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      const res = await fetch("/api/events/list/?limit=500", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      const rows = pickEvents(json);
      setEvents(rows);
      setFilteredEvents(rows);
      setLoading(false);
    }
    loadEvents();
  }, []);

  const sponsoredEvents = useMemo(
    () => events.filter((e) => SPONSORED_EVENT_SLUGS.has(e.slug)),
    [events]
  );

  const featuredEvents = useMemo(
    () =>
      events
        .filter((e) => !SPONSORED_EVENT_SLUGS.has(e.slug))
        .filter((e) => e.image_url || e.youtube_url || e.spotify_url)
        .slice(0, 6),
    [events]
  );

  const formatDate = (d?: string | null) =>
    d ? dayjs(d).format("MMM D, YYYY") : "Date TBA";

  const renderCard = (e: EventItem, label?: string) => (
    <Link
      key={e.id}
      href={`/events/${e.slug}`}
      className="block min-w-[260px] max-w-[260px] rounded-2xl border bg-white shadow-sm hover:shadow-md overflow-hidden"
    >
      <div className="relative h-36 w-full">
        <Image
          src={e.image_url || "/images/default.jpeg"}
          alt={e.title}
          fill
          className="object-cover"
        />
        {label && (
          <div className="absolute left-3 top-3">
            <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#c94917] shadow-sm border border-orange-200">
              {label}
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-sm text-neutral-600">
          {formatDate(e.starts_at)}
        </div>
        <div className="mt-1 font-semibold text-[#c94917]">
          {e.title}
        </div>
      </div>
    </Link>
  );

  if (loading) return <p>Loading events…</p>;

  return (
    <section className="max-w-5xl mx-auto mt-6 space-y-10">
      <FilterBar onFilter={() => {}} />

      {sponsoredEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Sponsored Events</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {sponsoredEvents.map((e) => renderCard(e, "Sponsored"))}
          </div>
        </div>
      )}

      {featuredEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Editor’s Picks</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {featuredEvents.map((e) => renderCard(e, "Featured"))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {filteredEvents.map((e) => (
          <div key={e.id}>{renderCard(e)}</div>
        ))}
      </div>
    </section>
  );
}