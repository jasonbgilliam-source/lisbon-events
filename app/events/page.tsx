"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import dayjs from "dayjs";
import FilterBar from "@/components/FilterBar";

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
  age?: string | null;
  category?: string | null;
  image_url?: string | null;
  source_folder?: string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  is_free?: boolean | null;
};

function pickEvents(json: any): EventItem[] {
  // be forgiving about response shapes
  const arr =
    json?.events ??
    json?.data ??
    json?.items ??
    json?.rows ??
    (Array.isArray(json) ? json : null);

  return Array.isArray(arr) ? (arr as EventItem[]) : [];
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      setError(null);

      try {
        // Public API should be server-side + RLS-safe
        const res = await fetch("/api/events/list/?limit=500", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `Failed to load events (${res.status})`);

        const rows = pickEvents(json);
        setEvents(rows);
        setFilteredEvents(rows);
      } catch (e: any) {
        setEvents([]);
        setFilteredEvents([]);
        setError(e?.message ?? "Failed to load events");
        console.error("Events load error:", e);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  const handleFilter = (filters: any) => {
    let filtered = [...events];

    if (filters.search) {
      const term = String(filters.search).toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title?.toLowerCase().includes(term) ||
          (e.description || "").toLowerCase().includes(term) ||
          (e.location_name || "").toLowerCase().includes(term)
      );
    }

    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter((e) =>
        filters.categories.some((c: string) =>
          (e.category || "").toLowerCase().includes(String(c).toLowerCase())
        )
      );
    }

    if (filters.audience && filters.audience.length > 0) {
      filtered = filtered.filter((e) =>
        filters.audience.some((a: string) =>
          (e.age || "").toLowerCase().includes(String(a).toLowerCase())
        )
      );
    }

    if (filters.is_free) {
      filtered = filtered.filter(
        (e) => e.is_free === true || (e.price || "").trim().toLowerCase() === "free"
      );
    }

    setFilteredEvents(filtered);
  };

  const formatDate = (dateStr?: string | null) =>
    dateStr ? dayjs(dateStr).format("ddd, MMM D, YYYY h:mm A") : "";

  const getImage = (e: EventItem) => {
    // 1) Local repo image: source_folder + image_url
    if (e.image_url && e.source_folder) {
      const folder = String(e.source_folder).replace(/^\.?\/*/, "");
      const filename = String(e.image_url).replace(/^\.?\/*/, "");
      return `/${folder}${folder.endsWith("/") ? "" : "/"}${filename}`;
    }

    // 2) Full URL
    if (e.image_url && e.image_url.startsWith("http")) return e.image_url;

    // 3) YouTube thumbnail fallback
    if (e.youtube_url) {
      const match = e.youtube_url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }

    // 4) Spotify fallback
    if (e.spotify_url) return "/images/spotify-cover.jpeg";

    // 5) Category fallback
    if (e.category) return `/images/${e.category.toLowerCase().replace(/\s+/g, "-")}.jpeg`;

    // 6) Default fallback
    return "/images/default.jpeg";
  };

  return (
    <section className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#c94917]">Upcoming events</h2>
        <p className="text-sm text-gray-700">Browse what’s happening next in Lisbon.</p>
      </div>

      <Suspense
        fallback={<p className="text-center text-gray-500 italic mb-6">Loading filters…</p>}
      >
        <FilterBar onFilter={handleFilter} />
      </Suspense>

      {error ? (
        <div className="mt-6 border border-red-200 bg-red-50 text-red-700 rounded-lg p-4 text-sm">
          <div className="font-semibold mb-1">Events failed to load</div>
          <div>{error}</div>
          <div className="mt-2 text-xs">
            Tip: try <code className="px-1 py-0.5 bg-white rounded border">/api/events/list/?debug=1</code>
          </div>
        </div>
      ) : loading ? (
        <p className="text-center text-gray-600 mt-10">Loading events…</p>
      ) : filteredEvents.length === 0 ? (
        <p className="text-center text-gray-600 italic mt-10">No events found.</p>
      ) : (
        <div className="flex flex-col gap-6 mt-8">
          {filteredEvents.map((e) => (
            <Link
              key={e.id}
              href={`/events/${encodeURIComponent(e.slug)}`}
              className="flex flex-col sm:flex-row bg-white border border-orange-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div className="relative w-full sm:w-56 h-40 sm:h-auto">
                <Image
                  src={getImage(e)}
                  alt={e.title}
                  fill
                  className="object-cover"
                  onError={(ev) => {
                    const target = ev.target as HTMLImageElement;
                    target.src = "/images/default.jpeg";
                  }}
                />
              </div>

              <div className="flex-1 p-5">
                <div className="flex justify-between items-start gap-3 mb-1">
                  <h3 className="text-xl font-semibold text-[#c94917]">{e.title}</h3>
                  <span className="text-xs text-gray-500">View →</span>
                </div>

                <p className="text-sm text-gray-700 mb-1">📍 {e.location_name || "Location TBA"}</p>
                <p className="text-sm text-gray-700 mb-1">
                  🕒 {formatDate(e.starts_at)}
                  {e.ends_at ? ` – ${formatDate(e.ends_at)}` : ""}
                </p>

                {e.price ? (
                  <p className="text-sm text-gray-700 mb-1">💶 {e.price}</p>
                ) : (
                  <p className="text-sm text-green-700 font-medium mb-1">🆓 Free</p>
                )}

                {e.age ? <p className="text-sm text-gray-700 mb-1">🔞 {e.age}</p> : null}

                {e.description ? (
                  <p className="text-sm text-gray-700 mt-2 line-clamp-2">{e.description}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
