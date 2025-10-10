"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// ✅ Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type EventItem = {
  id: string;
  title: string;
  description?: string;
  category: string;
  location_name?: string;
  city?: string;
  address?: string;
  ticket_url?: string;
  youtube_url?: string;
  spotify_url?: string;
  starts_at?: string;
  ends_at?: string;
};

export default function CategoryDetailPage() {
  const { slug } = useParams();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const categoryName = slug.toString().replace(/-/g, " ");

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("event_submissions")
          .select("*")
          .eq("status", "approved")
          .ilike("category", categoryName);

        if (error) throw error;
        setEvents(data || []);
      } catch (err) {
        console.error("Error loading events:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [categoryName]);

  const getEventImage = (event: EventItem) => {
    // YouTube thumbnail
    if (event.youtube_url && event.youtube_url.includes("youtube.com")) {
      const match = event.youtube_url.match(/v=([^&]+)/);
      if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }

    // Spotify preview image (if any)
    if (event.spotify_url && event.spotify_url.includes("spotify.com")) {
      return "/images/spotify-placeholder.jpeg";
    }

    // Category image
    const slug = event.category.toLowerCase().replace(/\s+/g, "-");
    return `/images/${slug}.jpeg`;
  };

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/categories"
          className="text-[#c94917] underline text-sm mb-6 inline-block"
        >
          ← Back to Categories
        </Link>

        <h1 className="text-4xl font-bold mb-6 capitalize">{categoryName}</h1>

        {loading ? (
          <p>Loading events…</p>
        ) : events.length === 0 ? (
          <p className="text-gray-600 italic">No events found in this category.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => {
              const imagePath = getEventImage(event);
              const fallback = "/images/default.jpeg";
              return (
                <div
                  key={event.id}
                  className="bg-white shadow-md rounded-2xl overflow-hidden border border-orange-200 hover:shadow-xl transition transform hover:-translate-y-1"
                >
                  <div className="relative w-full h-56">
                    <Image
                      src={imagePath}
                      alt={event.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover rounded-t-2xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = fallback;
                      }}
                    />
                  </div>
                  <div className="p-5">
                    <h2 className="text-xl font-semibold mb-1">
                      {event.title}
                    </h2>
                    <p className="text-sm text-gray-600 mb-2">
                      {event.location_name || event.city || ""}
                    </p>
                    {event.description && (
                      <p className="text-sm line-clamp-3">{event.description}</p>
                    )}
                    {event.ticket_url && (
                      <Link
                        href={event.ticket_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#c94917] text-sm mt-2 inline-block"
                      >
                        View Event →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
