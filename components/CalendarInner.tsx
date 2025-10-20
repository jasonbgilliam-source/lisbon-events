"use client";

import React, { useEffect, useState, useMemo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { createClient } from "@supabase/supabase-js";
import FilterBar from "@/components/FilterBar";
import EventCard from "@/components/EventCard";

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

const occursOnDay = (event: EventItem, day: dayjs.Dayjs) => {
  const start = dayjs(event.starts_at);
  const end = event.ends_at ? dayjs(event.ends_at) : start;
  return day.isBetween(start.startOf("day"), end.endOf("day"), null, "[]");
};

export default function CalendarInner() {
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
      if (
        filters.search &&
        !`${e.title} ${e.description} ${e.location_name}`
          .toLowerCase()
          .includes(filters.search.toLowerCase())
      )
        return false;
      if (filters.categories && filters.categories.length > 0) {
        const cats = Array.isArray(e.categories)
          ? e.categories.map((c: string) => c.toLowerCase())
          : typeof e.categories === "string"
          ? e.categories
              .replace(/[{}"]/g, "")
              .split(",")
              .map((x) => x.trim().toLowerCase())
          : [];
        if (!filters.categories.some((c: string) => cats.includes(c.toLowerCase())))
          return false;
      }
      if (filters.audience && filters.audience.length > 0) {
        const aud = Array.isArray(e.audience)
          ? e.audience.map((a: string) => a.toLowerCase())
          : typeof e.audience === "string"
          ? e.audience
              .replace(/[{}"]/g, "")
              .split(",")
              .map((x) => x.trim().toLowerCase())
          : [];
        if (!filters.audience.some((a: string) => aud.includes(a.toLowerCase())))
          return false;
      }
      if (
        filters.is_free &&
        e.price &&
        e.price.trim() !== "" &&
        e.price.trim().toLowerCase() !== "free"
      )
        return false;
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
    occursOnDay(e, selectedDate)
  );

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
            No events have been submitted for this day.
          </p>
        ) : (
          <div className="flex flex-col gap-6 mt-8 transition-all">
            {eventsForSelectedDate.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
