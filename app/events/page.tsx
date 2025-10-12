"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { createClient } from "@supabase/supabase-js";
import FilterBar from "@/components/FilterBar";

dayjs.extend(isBetween);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type EventItem = {
  id: number | string;
  title: string;
  description: string;
  starts_at: string;
  ends_at?: string;
  location_name?: string;
  address?: string;
  city?: string;
  price?: string;
  age?: string;
  category?: string;
  image_url?: string;
  youtube_url?: string;
  spotify_url?: string;
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      const { data, error } = await supabase
        .from("event_submissions")
        .select("*")
        .eq("status", "approved")
        .order("starts_at", { ascending: true });

      if (error) console.error(error);
      else setEvents(data || []);
      setLoading(false);
    }

    loadEvents();
  }, []);

  const formatDate = (dateStr?: string) =>
    dateStr ? dayjs(dateStr).format("MMM D, YYYY h:mm A") : "";

  // 🧠 Filtering logic
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const start = dayjs(e.starts_at);
      const now = dayjs();

      // Search
      if (
        filters.search &&
        !`${e.title} ${e.description} ${e.location_name}`
          .toLowerCase()
          .includes(filters.search.toLowerCase())
      )
        return false;

      // Category
      if (filters.category && e.category !== filters.category) return false;

      // City
      if (filters.city && e.city !== filters.city) return false;

      // Date range
      if (filters.dateRange === "today" && !start.isSame(now, "day")) return false;
      if (
        filters.dateRange === "week" &&
        !start.isBetween(now.startOf("week"), now.endOf("week"), null, "[]")
      )
        return false;
      if (
        filters.dateRange === "month" &&
        !start.isBetween(now.startOf("month"), now.endOf("month"), null, "[]")
      )
        return false;

      // Free only
      if (filters.is_free && e.price && e.price.trim() !== "" && e.price.trim() !== "Free")
        return false;

      // Price range
      if (filters.priceRange === "under10") {
        const num = parseFloat(e.price?.replace(/[^0-9.]/g, "") || "0");
        if (num > 10) return false;
      } else if (filters.priceRange === "10to30") {
        const num = parseFloat(e.price?.replace(/[^0-9.]/g, "") || "0");
        if (num < 10 || num > 30) return false;
      } else if (filters.priceRange === "30plus") {
        const num = parseFloat(e.price?.replace(/[^0-9.]/g, "") || "0");
        if (num < 30) return false;
      }

      // Age restriction
      if (filters.age && e.age && !e.age.includes(filters.age)) return false;

      return true;
    });
  }, [events, filters]);

  // 🎞️ Helper: Extract YouTube thumbnail
  const getYouTubeThumbnail = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
  };

  // 🎧 Helper: Spotify thumbnail
  const getSpotifyThumbnail = (url?: string) => {
    if (!url) return null;
    return url.includes("spotify") ? "/images/spotify-cover.jpeg" : null;
  };

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <section className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center text-[#c94917]">
          Upcoming Events in Lisbon
        </h1>

        {/* 🟠 Filter Bar */}
        <FilterBar onFilter={setFilters} />

        {loading ? (
          <p className="text-center text-gray-600 mt-10">Loading events…</p>
        ) : filteredEvents.length === 0 ? (
          <p className="text-center text-gray-600 mt-10 italic">
            No events match your filters.
          </p>
        ) : (
          <div className="flex flex-col gap-6 mt-8">
            {filteredEvents.map((e) => {
              const expanded = expandedId === String(e.id);

              // 🖼️ Prioritize images
              let imgSrc: string;
              if (e.image_url && e.image_url.trim() !== "") {
                imgSrc = e.image_url;
              } else if (e.youtube_url && getYouTubeThumbnail(e.youtube_url)) {
                imgSrc = getYouTubeThumbnail(e.youtube_url)!;
              } else if (e.spotify_url && getSpotifyThumbnail(e.spotify_url)) {
                imgSrc = getSpotifyThumbnail(e.spotify_url)!;
              } else if (e.category) {
                imgSrc = `/images/${e.category.toLowerCase().replace(/\s+/g, "-")}.jpeg`;
              } else {
                imgSrc = "/images/default.jpeg";
              }

              return (
                <div
                  key={e.id}
                  onClick={() => setExpandedId(expanded ? null : String(e.id))}
                  className={`flex flex-col sm:flex-row bg-white border border-orange-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer ${
                    expanded ? "scale-[1.02] bg-orange-50" : ""
                  }`}
                >
                  {/* 🖼️ Image */}
                  <div className="relative w-full sm:w-56 h-40 sm:h-auto">
                    <Image
                      src={imgSrc}
                      alt={e.title}
                      fill
                      className="object-cover"
                      onError={(ev) => {
                        const target = ev.target as HTMLImageElement;
                        target.src = "/images/default.jpeg";
                      }}
                    />
                  </div>

                  {/* 📋 Event Info */}
                  <div className="flex-1 p-5">
                    <div className="flex justify-between items-center mb-1">
                      <h2 className="text-xl font-semibold text-[#c94917]">{e.title}</h2>
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
                      <p className="text-sm text-green-700 font-medium mb-1">🆓 Free</p>
                    )}
                    {e.age && <p className="text-sm text-gray-700 mb-1">🔞 {e.age}</p>}

                    {/* Description */}
                    {e.description && (
                      <p
                        className={`text-sm text-gray-700 mt-2 transition-all duration-300 ${
                          expanded ? "line-clamp-none" : "line-clamp-2"
                        }`}
                      >
                        {e.description}
                      </p>
                    )}

                    {/* Links only when expanded */}
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
