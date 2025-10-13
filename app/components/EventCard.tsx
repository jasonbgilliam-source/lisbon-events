"use client";
import React, { useEffect, useState } from "react";

interface Event {
  title: string;
  start: string;
  end: string;
  all_day?: boolean;
  venue?: string;
  city?: string;
  address?: string;
  price?: string;
  age?: string;
  category?: string;
  description?: string;
  organizer?: string;
  source_url?: string;
  image_url?: string;
  youtube_url?: string;
  spotify_url?: string;
  tags?: string;
  recurrence_note?: string;
}

export default function EventCard({ event }: { event: Event }) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchImage() {
      // ✅ 1. Use Supabase image_url if provided
      if (event.image_url) {
        setPreviewImage(event.image_url);
        return;
      }

      // ✅ 2. Try YouTube or Spotify preview thumbnails
      if (event.youtube_url) {
        const match = event.youtube_url.match(
          /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/
        );
        if (match) {
          setPreviewImage(`https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`);
          return;
        }
      }
      if (event.spotify_url) {
        // Spotify thumbnails aren't public, so use Spotify logo placeholder
        setPreviewImage("/images/spotify-placeholder.jpg");
        return;
      }

      // ✅ 3. Try Microlink screenshot if source_url available
      if (event.source_url) {
        try {
          const res = await fetch(
            `https://api.microlink.io?url=${encodeURIComponent(
              event.source_url
            )}&screenshot=true&meta=false`
          );
          const data = await res.json();
          if (data?.data?.screenshot?.url) {
            setPreviewImage(data.data.screenshot.url);
            return;
          }
        } catch {
          // continue to fallback
        }
      }

      // ✅ 4. Fallback to local category image
      const categoryImage = `/images/${event.category
        ?.toLowerCase()
        .replace(/\s+/g, "-")}.jpg`;
      setPreviewImage(categoryImage);
    }

    fetchImage();
  }, [
    event.image_url,
    event.youtube_url,
    event.spotify_url,
    event.source_url,
    event.category,
  ]);

  const date = new Date(event.start).toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <article className="rounded-2xl overflow-hidden shadow-md border border-[#f1e4d0] bg-[#fffaf5] transition hover:shadow-lg hover:-translate-y-1 duration-200">
      {/* Image */}
      {previewImage ? (
        <img
          src={previewImage}
          alt={event.title}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-[#f1e4d0] flex items-center justify-center text-[#b84b22]/70 text-sm italic">
          Loading preview...
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex flex-col justify-between h-full">
        <h3 className="text-lg font-semibold text-[#b84b22] mb-1 line-clamp-2">
          {event.title}
        </h3>
        <p className="text-sm text-gray-700 mb-2">{date}</p>
        {event.venue && (
          <p className="text-sm text-gray-600 mb-2">
            📍 {event.venue}
            {event.city ? `, ${event.city}` : ""}
          </p>
        )}
        {event.price && (
          <p className="text-sm text-gray-600 mb-2">💶 {event.price}</p>
        )}
        <p className="text-sm text-gray-700 line-clamp-3 mb-3">
          {event.description || "No description provided."}
        </p>
        {event.source_url && (
          <a
            href={event.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-auto text-[#b84b22] hover:text-[#8a351a] font-medium transition"
          >
            View Details →
          </a>
        )}
      </div>
    </article>
  );
}
