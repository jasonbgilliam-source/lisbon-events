"use client";

import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { createClient } from "@supabase/supabase-js";
import EventCard from "@/components/EventCard";
import Link from "next/link";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type EventItem = {
  id: string | number;
  title: string;
  description?: string;
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

export default function FeaturedPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatured() {
      setLoading(true);
      const todayStart = dayjs().startOf("day").toISOString();
      const todayEnd = dayjs().endOf("day").toISOString();

      const { data, error } = await supabase
        .from("event_submissions")
        .select("*")
        .eq("status", "approved")
        .gte("starts_at", todayStart)
        .lte("starts_at", todayEnd)
        .order("starts_at", { ascending: true });

      if (!error && data) setEvents(data);
      setLoading(false);
    }
    loadFeatured();
  }, []);

  const DiscoverFallback = () => (
    <section className="max-w-5xl mx-auto py-16 px-6 text-center">
      <h2 className="text-3xl font-semibold mb-3">What’s on in Lisbon</h2>
      <p className="text-gray-700 mb-6 text-lg">
        Discover concerts, food festivals, markets, and more. Share your event in minutes.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/events"
          className="bg-orange-100 text-[#40210f] px-6 py-2 rounded-full font-semibold hover:bg-orange-200 transition"
        >
          Browse Events
        </Link>
        <Link
          href="/submit"
          className="bg-orange-100 text-[#40210f] px-6 py-2 rounded-full font-semibold hover:bg-orange-200 transition"
        >
          Submit an Event
        </Link>
      </div>
    </section>
  );

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <section className="max-w-5xl mx-auto">
        {loading ? (
          <p className="text-center text-gray-600 mt-10">Loading events…</p>
        ) : events.length === 0 ? (
          <DiscoverFallback />
        ) : (
          <>
            <h1 className="text-4xl font-bold mb-6 text-center text-[#c94917]">
              🎉 Today’s Featured Events in Lisbon
            </h1>
            <div className="flex flex-col gap-6 mt-8">
              {events.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
