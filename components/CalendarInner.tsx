"use client";

import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import FilterBar, { type EventFilters } from "@/components/FilterBar";
import EventCard from "@/components/EventCard";

dayjs.extend(isBetween);

type EventItem = {
  id: string | number;
  slug?: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  location_name?: string | null;
  address?: string | null;
  city?: string | null;
  price?: string | null;
  category?: string | null;
  categories?: string[] | string | null;
  audience?: string[] | string | null;
  image_url?: string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  is_free?: boolean | null;
  age?: string | null;
};

function occursOnDay(event: EventItem, day: dayjs.Dayjs) {
  const start = dayjs(event.starts_at);
  if (!start.isValid()) return false;

  const end = event.ends_at ? dayjs(event.ends_at) : start;
  const safeEnd = end.isValid() ? end : start;

  return day.isBetween(start.startOf("day"), safeEnd.endOf("day"), null, "[]");
}

function normalizeAudience(value: string) {
  const s = String(value || "").trim().toLowerCase();
  if (!s) return "";
  if (s === "all ages" || s === "all-ages") return "all ages";
  if (s === "family") return "family";
  if (s === "kids" || s === "children") return "kids";
  if (s === "teens" || s === "teen") return "teens";
  if (s === "adults" || s === "adult") return "adults";
  return s;
}

function extractAudience(event: EventItem): string[] {
  if (Array.isArray(event.audience) && event.audience.length > 0) {
    return event.audience.map(normalizeAudience).filter(Boolean);
  }

  if (typeof event.audience === "string" && event.audience.trim()) {
    return event.audience
      .replace(/[{}"]/g, "")
      .split(",")
      .map((x) => normalizeAudience(x))
      .filter(Boolean);
  }

  const age = String(event.age || "").toLowerCase();
  if (!age) return ["all ages"];
  if (age.includes("all ages") || age.includes("all-ages")) return ["all ages"];

  const hits: string[] = [];
  if (age.includes("family")) hits.push("family");
  if (age.includes("kids") || age.includes("children")) hits.push("kids");
  if (age.includes("teen")) hits.push("teens");
  if (age.includes("adult")) hits.push("adults");

  return hits.length > 0 ? Array.from(new Set(hits)) : ["all ages"];
}

export default function CalendarInner() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filters, setFilters] = useState<EventFilters>({
    search: "",
    categories: [],
    audience: [],
    is_free: false,
  });
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/events/list/?limit=2000", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json?.error || `Failed to load events (${res.status})`);
        }

        const items = Array.isArray(json?.items) ? json.items : [];
        setEvents(items);
      } catch (e: any) {
        setEvents([]);
        setError(e?.message ?? "Failed to load calendar events.");
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filters.search) {
        const haystack = `${e.title || ""} ${e.description || ""} ${e.location_name || ""}`.toLowerCase();
        if (!haystack.includes(filters.search.toLowerCase())) return false;
      }

      if (filters.categories.length > 0) {
        const eventCategories = [
          ...(Array.isArray(e.categories) ? e.categories : []),
          ...(typeof e.categories === "string"
            ? e.categories.replace(/[{}"]/g, "").split(",").map((x) => x.trim())
            : []),
          ...(e.category ? [e.category] : []),
        ]
          .map((x) => String(x).toLowerCase())
          .filter(Boolean);

        const selectedCategories = filters.categories.map((c) => c.toLowerCase());

        if (!selectedCategories.some((c) => eventCategories.includes(c))) return false;
      }

      if (filters.audience.length > 0) {
        const eventAudience = extractAudience(e);
        const selectedAudience = filters.audience.map(normalizeAudience).filter(Boolean);

        if (!selectedAudience.includes("all ages")) {
          if (!eventAudience.includes("all ages") && !selectedAudience.some((a) => eventAudience.includes(a))) {
            return false;
          }
        }
      }

      if (filters.is_free) {
        const price = String(e.price || "").trim().toLowerCase();
        const isFree = e.is_free === true || price === "free" || price === "";
        if (!isFree) return false;
      }

      return true;
    });
  }, [events, filters]);

  const daysInMonth = Array.from({ length: currentMonth.daysInMonth() }, (_, i) =>
    currentMonth.date(i + 1)
  );
  const firstDayOfMonth = currentMonth.startOf("month").day();
  const paddedDays = Array.from({ length: firstDayOfMonth }, () => null);

  const handlePrev = () => setCurrentMonth((prev) => prev.subtract(1, "month"));
  const handleNext = () => setCurrentMonth((prev) => prev.add(1, "month"));

  const eventsForSelectedDate = filteredEvents.filter((e) => occursOnDay(e, selectedDate));

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <section className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center text-[#c94917]">
          Lisbon Events Calendar
        </h1>

        <FilterBar value={filters} onChange={setFilters} />

        {error ? (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

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

        {loading ? (
          <p className="text-center text-gray-600 mt-10">Loading events…</p>
        ) : eventsForSelectedDate.length === 0 ? (
          <p className="text-center text-gray-600 mt-10 italic">
            No events found for this day.
          </p>
        ) : (
          <div className="flex flex-col gap-6 mt-8 transition-all">
            {eventsForSelectedDate.map((e) => (
              <EventCard key={String(e.id)} e={e} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
