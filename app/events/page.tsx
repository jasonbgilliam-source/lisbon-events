"use client";

import React, { useState, useEffect, Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import FilterBar from "@/components/FilterBar";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type EventItem = {
  id: string;
  title: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  location_name?: string;
  address?: string;
  city?: string;
  price?: string;
  age?: string;
  category?: string;
  image_url?: string;
  source_folder?: string; // 👈 important new field
  youtube_url?: string;
  spotify_url?: string;
  is_free?: boolean;
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 🔄 Load data from Supabase
  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      const { data, error } = await supabase
        .from("event_submissions")
        .select("*")
        .eq("status", "approved")
        .order("starts_at", { ascending: true });

      if (error) console.error("Error loading events:", error);
      else {
        setEvents(data || []);
        setFilteredEvents(data || []);
      }
      setLoading(false);
    }
    loadEvents();
  }, []);

  // 🎛️ Handle filters
  const handleFilter = (filters: any) => {
    let filtered = [...events];

    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title?.toLowerCase().includes(term) ||
          e.description?.toLowerCase().includes(term) ||
          e.location_name?.toLowerCase().includes(term)
      );
    }

    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter((e) =>
        filters.categories.some((c: string) =>
          e.category?.toLowerCase().includes(c.toLowerCase())
        )
      );
    }

    if (filters.audience && filters.audience.length > 0) {
      filtered = filtered.filter((e) =>
        filters.audience.some((a: string) =>
          e.age?.toLowerCase().includes(a.toLowerCase())
        )
      );
    }

    if (filters.is_free) {
      filtered = filtered.filter(
        (e) => e.is_free === true || e.price?.trim().toLowerCase() === "free"
      );
    }

    setFilteredEvents(filtered);
  };

  // 🗓️ Format event times
  const formatDate = (dateStr?: string) =>
    dateStr ? dayjs(dateStr).format("ddd, MMM D, YYYY h:mm A") : "";

  // 🖼️ Build local image path or fallbacks
  const getImage = (e: EventItem) => {
    // 1️⃣ Local file: combine source_folder + image_url
    if (e.image_url && e.source_folder) {
      const folder = e.source_folder.replace(/^\.?\/*/, ""); // remove leading ./ or /
      const filename = e.image_url.replace(/^\.?\/*/, "");
      return `/${folder}${folder.endsWith("/") ? "" : "/"}${filename}`;
    }

    // 2️⃣ If already a full URL (external)
    if (e.image_url && e.image_url.startsWith("http")) return e.image_url;

    // 3️⃣ YouTube thumbnail fallback
    if (e.youtube_url) {
      const match = e.youtube_url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }

    // 4️⃣ Spotify fallback
    if (e.spotify_url) return "/images/spotify-cover.jpeg";

    // 5️⃣ Category fallback
    if (e.category)
      return `/images/${e.category.toLowerCase().replace(/\s+/g, "-")}.jpeg`;

    // 6️⃣ Default fallback
    return "/images/default.jpeg";
  };

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <section className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center text-[#c94917]">
          Lisbon Events
        </h1>

        {/* 🎛️ Filter Bar */}
        <Suspense
          fallback={
            <p className="text-center text-gray-500 italic mb-6">
              Loading filters…
            </p>
          }
        >
          <FilterBar onFilter={handleFilter} />
        </Suspense>

        {/* 🔄 Loading / Empty / Content */}
        {loading ? (
          <p className="text-center text-gray-600 mt-10">Loading events…</p>
        ) : filteredEvents.length === 0 ? (
          <p className="text-center text-gray-600 italic mt-10">
            No events found.
          </p>
        ) : (
          <div className="flex flex-col gap-6 mt-8">
            {filteredEvents.map((e) => {
              const expanded = expandedId === e.id;

              return (
                <div
                  key={e.id}
                  onClick={() =>
                    setExpandedId(expanded ? null : e.id)
                  }
                  className={`flex flex-col sm:flex-row bg-white border border-orange-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer ${
                    expanded ? "scale-[1.02] bg-orange-50" : ""
                  }`}
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
                    <div className="flex justify-between items-center mb-1">
                      <h2 className="text-xl font-semibold text-[#c94917]">
                        {e.title}
                      </h2>
                      <span
                        className={`text-[#c94917] text-lg transform transition-transform duration-300 ${
                          expanded ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 mb-1">
                      📍 {e.location_name || "Location TBA"}
                    </p>
                    <p className="text-sm text-gray-700 mb-1">
                      🕒 {formatDate(e.starts_at)}
                      {e.ends_at ? ` – ${formatDate(e.ends_at)}` : ""}
                    </p>
                    {e.price ? (
                      <p className="text-sm text-gray-700 mb-1">💶 {e.price}</p>
                    ) : (
                      <p className="text-sm text-green-700 font-medium mb-1">
                        🆓 Free
                      </p>
                    )}
                    {e.age && (
                      <p className="text-sm text-gray-700 mb-1">🔞 {e.age}</p>
                    )}

                    {e.description && (
                      <p
                        className={`text-sm text-gray-700 mt-2 transition-all duration-300 ${
                          expanded ? "line-clamp-none" : "line-clamp-2"
                        }`}
                      >
                        {e.description}
                      </p>
                    )}

                    {expanded && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {e.youtube_url && (
                          <a
                            href={e.youtube_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-[#c94917] underline"
                          >
                            🎥 YouTube
                          </a>
                        )}
                        {e.spotify_url && (
                          <a
                            href={e.spotify_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-[#c94917] underline"
                          >
                            🎵 Spotify
                          </a>
                        )}
                        {e.address && (
                          <Link
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              e.address
                            )}`}
                            target="_blank"
                            className="text-sm text-[#c94917] underline"
                          >
                            🗺️ Map
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
