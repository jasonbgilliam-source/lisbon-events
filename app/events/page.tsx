"use client";

import React, { useEffect, useState, useMemo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { createClient } from "@supabase/supabase-js";
import FilterBar from "@/components/FilterBar";
import EventCard from "@/components/EventCard"; // ✅ Use the reusable EventCard component

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
  source_url?: string;
  source_folder?: string; 
};


export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // ✅ Load events from Supabase
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

  // ✅ Apply filters dynamically
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // 🔍 Search
      if (
        filters.search &&
        !`${e.title} ${e.description} ${e.location_name}`
          .toLowerCase()
          .includes(filters.search.toLowerCase())
      )
        return false;

      // 🎭 Category filter
      if (filters.categories && filters.categories.length > 0) {
        const eventCats =
          Array.isArray(e.categories) && e.categories.length
            ? e.categories.map((c: string) => c.toLowerCase())
            : typeof e.categories === "string"
            ? e.categories
                .replace(/[{}"]/g, "")
                .split(",")
                .map((x) => x.trim().toLowerCase())
            : [];
        const match = filters.categories.some((c: string) =>
          eventCats.includes(c.toLowerCase())
        );
        if (!match) return false;
      }

      // 👨‍👩‍👧 Audience filter
      if (filters.audience && filters.audience.length > 0) {
        const eventAud =
          Array.isArray(e.audience) && e.audience.length
            ? e.audience.map((a: string) => a.toLowerCase())
            : typeof e.audience === "string"
            ? e.audience
                .replace(/[{}"]/g, "")
                .split(",")
                .map((x) => x.trim().toLowerCase())
            : [];
        const match = filters.audience.some((a: string) =>
          eventAud.includes(a.toLowerCase())
        );
        if (!match) return false;
      }

      // 🆓 Free events filter
      if (filters.is_free && e.price && e.price.trim() !== "" && e.price.trim() !== "Free")
        return false;

      return true;
    });
  }, [events, filters]);

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <section className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center text-[#c94917]">
          Upcoming Events in Lisbon
        </h1>

        {/* ✅ Filter bar */}
        <FilterBar onFilter={setFilters} />

        {loading ? (
          <p className="text-center text-gray-600 mt-10">Loading events…</p>
        ) : filteredEvents.length === 0 ? (
          <p className="text-center text-gray-600 mt-10 italic">
            No events match your filters.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {filteredEvents.map((e) => (
              <EventCard
                key={e.id}
                event={{
                  title: e.title,
                  start: e.starts_at,
                  end: e.ends_at,
                  venue: e.location_name,
                  city: e.city,
                  address: e.address,
                  price: e.price,
                  category:
                    Array.isArray(e.categories) && e.categories.length
                      ? e.categories[0]
                      : typeof e.categories === "string"
                      ? e.categories.replace(/[{}"]/g, "").split(",")[0]
                      : "default",
                  description: e.description,
                  organizer: "",
                  source_url: e.source_url,
                  image_url: e.image_url,
                  youtube_url: e.youtube_url,
                  spotify_url: e.spotify_url,
                  source_folder:
                    "public/event-images/Gmail-Lisboa-Events-05_10_2025-19_10_2025",
                  tags: "",
                }}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
