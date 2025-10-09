"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

// ✅ Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Event = {
  id: number;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  location_name?: string;
  city?: string;
  category?: string;
  description?: string;
  image_url?: string;
  source_url?: string;
  status?: string;
};

export default function CategoryDetailPage() {
  const params = useParams();
  const slug = decodeURIComponent(params.slug as string);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const categoryName = slug.replace(/-/g, " ");

        const { data, error } = await supabase
          .from("events") // or "event_submissions" if that's your table
          .select("*")
          .eq("category", categoryName)
          .order("starts_at", { ascending: true });

        if (error) throw error;
        // only show approved / published events
        const filtered = data.filter(
          (e: any) =>
            !e.status ||
            e.status === "approved" ||
            e.status === "published" ||
            e.status === "active"
        );

        setEvents(filtered);
      } catch (err) {
        console.error("Error loading events for category:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [slug]);

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f]">
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold text-center mb-2 capitalize">
          {slug.replace(/-/g, " ")}
        </h1>
        <p className="text-center text-gray-600 mb-10">
          {loading
            ? "Loading events..."
            : `${events.length} event${events.length === 1 ? "" : "s"} found`}
        </p>

        {loading ? (
          <p className="text-center text-gray-600 italic">Loading…</p>
        ) : events.length === 0 ? (
          <p className="text-center text-gray-600 italic">
            No events yet in this category.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white shadow-md hover:shadow-lg border border-orange-200 rounded-2xl overflow-hidden transition transform hover:-translate-y-1"
              >
                <div className="relative w-full h-56">
                  <Image
                    src={event.image_url || "/images/default.jpg"}
                    alt={event.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  <h2 className="text-xl font-semibold mb-2">
                    {event.title || "Untitled Event"}
                  </h2>
                  <p className="text-sm text-gray-600 mb-1">
                    {event.location_name || "Location TBA"}
                    {event.city ? `, ${event.city}` : ""}
                  </p>
                  {event.starts_at && (
                    <p className="text-sm text-gray-600 mb-3">
                      {new Date(event.starts_at).toLocaleDateString("en-GB", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 mb-3 line-clamp-3">
                    {event.description || "No description available."}
                  </p>
                  {event.source_url && (
                    <Link
                      href={event.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#c94917] font-semibold hover:underline"
                    >
                      Event Details →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
