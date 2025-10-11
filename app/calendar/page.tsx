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
  age?: string;
  category?: string;
  image_url?: string;
  youtube_url?: string;
  spotify_url?: string;
};

export default function CalendarPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [loading, setLoading] = useState(true);

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

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const start = dayjs(e.starts_at);
      const now = dayjs();

      if (
        filters.search &&
        !`${e.title} ${e.description} ${e.location_name}`
          .toLowerCase()
          .includes(filters.search.toLowerCase())
      )
        return false;

      if (filters.category && e.category !== filters.category) return false;
      if (filters.city && e.city !== filters.city) return false;

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

      if (filters.is_free && e.price && e.price.trim() !== "" && e.price.trim() !== "Free")
        return false;

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

      if (filters.age && e.age && !e.age.includes(filters.age)) return false;

      return true;
    });
  }, [events, filters]);

  const daysInMonth = Array.from({ length: currentMonth.daysInMonth() }, (_, i) =>
    currentMonth.date(i + 1)
  );
  const firstDayOfMonth = currentMonth.startOf("month").day();
  const paddedDays = Array.from({ length: firstDayOfMonth }, () => null);

  const handlePrev = () => setCurrentMonth(currentMonth.subtract(1, "month"));
  const handleNext = () => setCurrentMonth(currentMonth.add(1, "month"));

  const eventsForSelectedDate = filteredEvents.filter((e) =>
    dayjs(e.starts_at).isSame(selectedDate, "day")
  );

  const now = dayjs();
  const rangeStart =
    filters.dateRange === "week"
      ? now.startOf("week")
      : filters.dateRange === "month"
      ? now.startOf("month")
      : null;
  const rangeEnd =
    filters.dateRange === "week"
      ? now.endOf("week")
      : filters.dateRange === "month"
      ? now.endOf("month")
      : null;

  const formatDate = (dateStr?: string) =>
    dateStr ? dayjs(dateStr).format("MMM D, YYYY h:mm A") : "";

  const getYouTubeThumbnail = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
  };

  const getSpotifyThumbnail = (url?: string) => {
    if (!url) return null;
    if (url.includes("spotify")) return "/images/spotify-cover.jpeg";
    return null;
  };

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <section className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center text-[#c94917]">
          Lisbon Events Calendar
        </h1>

        <FilterBar onFilter={setFilters} />

        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handlePrev}
            className="px-3 py-1 border border-[#c94917] text-[#c94917] rounded-lg hover:bg-orange-50"
          >
            ← Prev
          </button>
          <h2 className="text-2xl font-semibold">
            {currentMonth.format("MMMM YYYY")}
          </h2>
          <button
            onClick={handleNext}
            className="px-3 py-1 border border-[#c94917] text-[#c94917] rounded-lg hover:bg-orange-50"
          >
            Next →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center font-semibold mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-[#c94917]">
              {d}
            </div>
          ))}
        </div>

       <div className="grid grid-cols-7 gap-3 mb-8">
  {[...paddedDays, ...daysInMonth].map((day, i) => {
    if (!day) return <div key={`pad-${i}`} />;

    const isSelected = day.isSame(selectedDate, "day");
    const hasEvents = filteredEvents.some((e) =>
      dayjs(e.starts_at).isSame(day, "day")
    );

    // Determine range highlights (this week / this month)
    let inRange = false;
    if (filters.dateRange === "week") {
      const weekStart = dayjs().startOf("week");
      const weekEnd = dayjs().endOf("week");
      inRange = day.isBetween(weekStart, weekEnd, null, "[]");
    } else if (filters.dateRange === "month") {
      const monthStart = dayjs().startOf("month");
      const monthEnd = dayjs().endOf("month");
      inRange = day.isBetween(monthStart, monthEnd, null, "[]");
    }

    let bgClass = "bg-gray-100 text-gray-400";

    if (isSelected) {
      bgClass = "bg-[#c94917] text-white border-[#c94917]";
    } else if (inRange && hasEvents) {
      bgClass = "bg-[#fdeee5] text-[#40210f] border-orange-200";
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
              } else if (e.category) {
                imgSrc = `/images/${e.category.toLowerCase().replace(/\s+/g, "-")}.jpeg`;
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
                    {e.age && <p className="text-sm text-gray-700 mb-1">🔞 {e.age}</p>}
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
