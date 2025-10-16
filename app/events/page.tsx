"use client";

import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";

// ✅ Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type EventItem = {
  id: string | number;
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
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);

      const today = dayjs().startOf("day").toISOString();
      const sevenDays = dayjs().add(7, "day").endOf("day").toISOString();

      const { data, error } = await supabase
        .from("event_submissions")
        .select("*")
        .eq("status", "approved")
        .gte("starts_at", today)
        .lte("starts_at", sevenDays)
        .order("starts_at", { ascending: true });

      if (error) console.error(error);
      else setEvents(data || []);
      setLoading(false);
    }

    loadEvents();
  }, []);

  const formatDate = (dateStr?: string) =>
    dateStr ? dayjs(dateStr).format("MMM D, YYYY h:mm A") : "";

  const getYouTubeThumbnail = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
  };

  const getSpotifyThumbnail = (url?: string) =>
    url && url.includes("spotify") ? "/images/spotify-cover.jpeg" : null;

  const resolveImage = (e: EventItem): string => {
    const cleanUrl = e.image_url?.trim();

    if (cleanUrl && /^https?:\/\//.test(cleanUrl)) {
      return cleanUrl; // ✅ Valid Supabase image URL
    } else if (e.youtube_url && getYouTubeThumbnail(e.youtube_url)) {
      return getYouTubeThumbnail(e.youtube_url)!;
    } else if (e.spotify_url && getSpotifyThumbnail(e.spotify_url)) {
      return getSpotifyThumbnail(e.spotify_url)!;
    } else if (e.category) {
      return `/images/${e.category.toLowerCase().replace(/\s+/g, "-")}.jpeg`;
    } else {
      return "/images/default.jpeg";
    }
  };

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <section className="max-w-4xl mx-auto">
        {loading ? (
          <p className="text-center text-gray-600 mt-10">Loading events…</p>
        ) : events.length === 0 ? (
          <p className="text-center text-gray-600 italic mt-10">
            No events found for the next 7 days.
          </p>
        ) : (
          <>
            <h1 className="text-4xl font-bold mb-6 text-center text-[#c94917]">
              Upcoming Week in Lisbon
            </h1>

            <div className="flex flex-col gap-6 mt-8">
              {events.map((e) => {
                const expanded = expandedId === String(e.id);
                const imgSrc = resolveImage(e);

                return (
                  <div
                    key={e.id}
                    onClick={() =>
                      setExpandedId(expanded ? null : String(e.id))
                    }
                    className={`flex flex-col sm:flex-row bg-white border border-orange-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer ${
                      expanded ? "scale-[1.02] bg-orange-50" : ""
                    }`}
                  >
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
          </>
        )}
      </section>
    </main>
  );
}
