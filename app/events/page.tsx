"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

// --- Supabase setup ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("starts_at", { ascending: true });

      if (error) console.error("❌ Error loading events:", error);
      else setEvents(data || []);

      setLoading(false);
    }
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading events...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] p-6">
      <h1 className="text-3xl font-bold mb-4">Upcoming Events</h1>

      <div className="grid gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white rounded-2xl shadow p-4 flex flex-col"
          >
            {event.image_url && (
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-48 object-cover rounded-xl mb-3"
              />
            )}
            <h2 className="text-xl font-semibold">{event.title}</h2>
            <p className="text-sm">{event.location_name}</p>
            <p className="text-sm">
              {new Date(event.starts_at).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            <Link
              href={event.ticket_url || "#"}
              className="mt-3 text-blue-700 underline"
            >
              View Details
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
