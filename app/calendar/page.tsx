"use client";

import React, { useEffect, useState, useMemo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { createClient } from "@supabase/supabase-js";
import FilterBar from "@/components/FilterBar";
import Image from "next/image";
import Link from "next/link";

dayjs.extend(isBetween);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type EventItem = {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  ends_at?: string;
  location_name?: string;
  address?: string;
  city?: string;
  price?: string;
  categories?: string[] | string;
  audience?: string[] | string;
  image_url?: string;
  youtube_url?: string;
  spotify_url?: string;
};

// Helper: returns true if event occurs on this day
const occursOnDay = (event: EventItem, day: dayjs.Dayjs) => {
  const start = dayjs(event.starts_at);
  const end = event.ends_at ? dayjs(event.ends_at) : start;
  return day.isBetween(start.startOf("day"), end.endOf("day"), null, "[]");
};

export default function CalendarPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [loading, setLoading] = useState(true);

  // ---- Fetch Events ----
  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      const { data, error } = await supabase
        .from("event_submissions")
        .select("*")
        .eq("status", "approved")
        .order("starts_at", { ascending: true });
      if (!error && data) setEvents(data);
      setLoading(false);
    }
    loadEvents();
  }, []);

  // ---- Filtering ----
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const start = dayjs(e.starts_at);
      const end = e.ends_at ? dayjs(e.ends_at) : start;

      // --- Search filter ---
      if (
        filters.search &&
        !`${e.title} ${e.description} ${e.location_name}`
          .toLowerCase()
          .includes(filters.search.toLowerCase())
      )
        return false;

      // --- Categories filter (supports arrays or Supabase array strings) ---
      if (filters.categories && filters.categories.length > 0) {
        const eventCats =
          Array.isArray(e.categories) && e.categories.length
            ? e.categories.map((c: string) => c.toLowerCase())
            : typeof e.categories === "string"
            ? e.categories.replace(/[{}"]/g, "").split(",").map((x) => x.trim().toLowerCase())
            : [];
        const match = filters.categories.some((c: string) =>
          eventCats.includes(c.toLowerCase())
        );
        if (!match) return false;
      }

      // --- Audience filter (same parsing logic) ---
      if (filters.audience && filters.audience.length > 0) {
        const eventAud =
          Array.isArray(e.audience) && e.audience.length
            ? e.audience.map((a: string) => a.toLowerCase())
            : typeof e.audience === "string"
            ? e.audience.replace(/[{}"]/g, "").split(",").map((x) => x.trim().toLowerCase())
            : [];
        const match = filters.audience.some((a: string) =>
          eventAud.includes(a.toLowerCase())
        );
        if (!match) return false;
      }

      // --- Price filter (Free only) ---
      if (filters.is_free && e.price && e.price.trim() !== "" && e.price.trim() !== "Free")
        return false;

      return true;
    });
  }, [events, filters]);

  // ---- Calendar Logic ----
  const daysInMonth = Array.from({ length: currentMonth.daysInMonth() }, (_, i) =>
    currentMonth.date(i + 1)
  );
  const firstDayOfMonth = currentMonth.startOf("month").day();
  const paddedDays = Array.from({ length: firstDayOfMonth }, () => null);

  const handlePrev = () => setCurrentMonth(currentMonth.subtract(1, "month"));
  const handleNext = () => setCurrentMonth(currentMonth.add(1, "month"));

  // ---- Events for Selected Day ----
  const eventsForSelectedDate = filteredEvents.filter((e) =>
    occursOnDay(e, selectedDate)
  );

  // ---- Utilities ----
  const formatDate = (dateStr?: string) =>
    dateStr ? dayjs(dateStr).format("MMM D, YYYY h:mm A") : "";

  const getYouTubeThumbnail = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
  };

  const getSpotifyThumbnail = (url?: string) =>
    url && url.includes("spotify") ? "/images/spotify-cover.jpeg" : null;

  // ---- Render ----
  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <section className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center text-[#c94917]">
          Lisbon Events Calendar
        </h1>

        <FilterBar onFilter={setFilters} />

        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handlePrev}
            className="px-3 py-1 border border-[#c94917] text-[#c94917] rounded-lg hover:bg-orange-50"
          >
            ← Prev
          </button>
          <h2 className="text-2xl font-semibold">{currentMonth.format("MMMM YYYY")}</h2>
          <button
            onClick={handleNext}
            className="px-3 py-1 border border-[#c94917] text-[#c94917] rounded-lg hover:bg-orange-50"
          >
            Next →
          </button>
        </div>

        {/* Week Headers */}
        <div className="grid grid-cols-7 gap-2 text-center font-semibold mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-[#c94917]">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-3 mb-8">
          {[...paddedDays, ...daysInMonth].map((day, i) => {
            if (!day) return <div key={`pad-${i}`} />;

            const isSelected = day.isSame(selectedDate, "day");
            const hasEvents = filteredEvents.some((e) => occursOnDay(e, day));

            let bgClass = "bg-gray-100 text-gray-400";
            if (isSelected) {
              bgClass = "bg-[#c94917] text-white border-[#c94917]";
            } else if (hasEvents) {
              bgClass = "bg-white hover:bg-orange-50 border-orange-200";
            }

            return (
              <div
                key={day.format("YYYY-MM-DD")}
                onClick={() => setSelectedDate(day)}
                className={`border rounded-xl p-2 h-16 flex items-center justify-center cursor-pointer transition ${bgClass}`}
              >
                {day.date()}
              </div>
            );
          })}
        </div>

        {/* Event List */}
        {loading ? (
          <p className="text-center text-gray-600 mt-10">Loading events…</p>
        ) : eventsForSelectedDate.length === 0 ? (
          <p className="text-center text-gray-600 mt-10 italic">
            No events have been submitted for this day.
          </p>
        ) : (
          <div className="flex flex-col gap-6 mt-8">
            {eventsForSelectedDate.map((e) => {
              let imgSrc: string;
              if (e.image_url && e.image_url.trim() !== "") {
                imgSrc = e.image_url;
              } else if (e.youtube_url && getYouTubeThumbnail(e.youtube_url)) {
                imgSrc = getYouTubeThumbnail(e.youtube_url)!;
              } else if (e.spotify_url && getSpotifyThumbnail(e.spotify_url)) {
                imgSrc = getSpotifyThumbnail(e.spotify_url)!;
              } else if (Array.isArray(e.categories) && e.categories.length > 0) {
                imgSrc = `/images/${e.categories[0].toLowerCase().replace(/\s+/g, "-")}.jpeg`;
              } else if (typeof e.categories === "string") {
                const firstCat = e.categories.replace(/[{}"]/g, "").split(",")[0];
                imgSrc = `/images/${firstCat?.trim().toLowerCase().replace(/\s+/g, "-")}.jpeg`;
              } else {
                imgSrc = "/images/default.jpeg";
              }

              return (
                <div
                  key={e.id}
                  className="flex flex-col sm:flex-row bg-white border border-orange-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition"
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
                    <h2 className="text-xl font-semibold mb-1 text-[#c94917]">{e.title}</h2>
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

                    {Array.isArray(e.audience) ? (
                      <p className="text-sm text-gray-700 mb-1">
                        🎯 Audience: {e.audience.join(", ")}
                      </p>
                    ) : typeof e.audience === "string" ? (
                      <p className="text-sm text-gray-700 mb-1">
                        🎯 Audience: {e.audience.replace(/[{}"]/g, "").split(",").join(", ")}
                      </p>
                    ) : null}

                    {e.description && (
                      <p className="text-sm text-gray-700 mt-2 line-clamp-2">{e.description}</p>
                    )}

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
