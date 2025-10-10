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
  price?: string;
  age?: string;
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

  const getCategoryImage = (category: string) => {
    const slug = category.toLowerCase().replace(/\s+/g, "-");
    return `/images/${slug}.jpeg`;
  };

  const getYouTubeEmbed = (url: string) => {
    const match = url.match(/(?:v=|be\/)([^&]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const getSpotifyEmbed = (url: string) => {
    if (!url.includes("spotify.com")) return null;
    return url
      .replace("open.spotify.com", "open.spotify.com/embed")
      .split("?")[0];
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
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
              const fallback = "/images/default.jpeg";
              const youtubeEmbed = event.youtube_url
                ? getYouTubeEmbed(event.youtube_url)
                : null;
              const spotifyEmbed = event.spotify_url
                ? getSpotifyEmbed(event.spotify_url)
                : null;
              const categoryImage = getCategoryImage(event.category);

              return (
                <div
                  key={event.id}
                  className="bg-white shadow-md rounded-2xl overflow-hidden border border-orange-200 hover:shadow-xl transition transform hover:-translate-y-1"
                >
                  {/* 🎬 Media Section */}
                  <div className="relative w-full h-56 bg-[#fff1e8] flex items-center justify-center">
                    {youtubeEmbed ? (
                      <div className="rounded-xl overflow-hidden border border-orange-300 shadow-inner bg-[#fff8f2]">
                        <iframe
                          src={youtubeEmbed}
                          className="w-[320px] h-[180px] md:w-[400px] md:h-[225px]"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          title={event.title}
                        ></iframe>
                      </div>
                    ) : spotifyEmbed ? (
                      <div className="rounded-xl overflow-hidden border border-orange-300 shadow-inner bg-[#fff8f2] p-1">
                        <iframe
                          src={spotifyEmbed}
                          width="100%"
                          height="152"
                          frameBorder="0"
                          allow="encrypted-media"
                          title={event.title}
                        ></iframe>
                      </div>
                    ) : (
                      <Image
                        src={categoryImage}
                        alt={event.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover rounded-t-2xl"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = fallback;
                        }}
                      />
                    )}
                  </div>

                  {/* 📝 Info Section */}
                  <div className="p-5">
                    <h2 className="text-xl font-semibold mb-1 text-[#c94917]">
                      {event.title}
                    </h2>

                    {/* Venue + Timing */}
                    <p className="text-sm text-gray-600 mb-1">
                      📍 {event.location_name || "Venue TBA"}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      🕒 {formatDateTime(event.starts_at)}
                      {event.ends_at ? ` – ${formatDateTime(event.ends_at)}` : ""}
                    </p>

                    {/* Price & Age */}
                    <p className="text-sm text-gray-700 mb-1">
                      💶 {event.price ? event.price : "Free or not listed"}
                    </p>
                    <p className="text-sm text-gray-700 mb-3">
                      🚸 {event.age ? `${event.age}+` : "All ages"}
                    </p>

                    {/* Description */}
                    {event.description && (
                      <p className="text-sm text-gray-800 mb-3 line-clamp-3">
                        {event.description}
                      </p>
                    )}

                    {/* Ticket link */}
                    {event.ticket_url && (
                      <Link
                        href={event.ticket_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#c94917] text-sm font-medium underline"
                      >
                        🎟️ View Event →
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
