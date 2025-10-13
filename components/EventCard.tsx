"use client";
import React, { useEffect, useState } from "react";
import Microlink from "@microlink/react";
import Image from "next/image";

type EventProps = {
  event: {
    title: string;
    start: string;
    end?: string;
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
  };
};

export default function EventCard({ event }: EventProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Format date
  const startDate = new Date(event.start);
  const formattedDate = startDate.toLocaleDateString("en-PT", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Compute fallback image
  const fallbackImage = `/images/${event.category?.toLowerCase() || "default"}.jpg`;

  // ✅ Determine best image source
  useEffect(() => {
    let img = event.image_url?.trim() || "";

    // --- Fix malformed Supabase / CSV URLs ---
    if (img) {
      img = img
        .replace("/public/public/", "/images/")
        .replace("/public/", "/images/")
        .replace(
          "https://lisbon-events.vercel.app",
          "https://lisbon-events-j9560p72f-jason-gilliams-projects.vercel.app"
        );

      // If it's still missing domain but looks like a relative path, fix it
      if (img.startsWith("/images/")) {
        img = `https://lisbon-events-j9560p72f-jason-gilliams-projects.vercel.app${img}`;
      }
    }

    // --- YouTube thumbnail fallback ---
    if (!img && event.youtube_url) {
      const match = event.youtube_url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/
      );
      if (match) {
        img = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
      }
    }

    // --- Spotify fallback ---
    if (!img && event.spotify_url) {
      img = "/images/spotify-placeholder.jpg";
    }

    // --- Category fallback ---
    if (!img) {
      img = fallbackImage;
    }

    setPreviewImage(img);
  }, [
    event.image_url,
    event.youtube_url,
    event.spotify_url,
    event.category,
    fallbackImage,
  ]);

  return (
    <div className="bg-[#fff8f3] border border-[#e1a46e] rounded-2xl shadow-sm hover:shadow-md transition p-4 flex flex-col">
      {/* ✅ Image or Microlink */}
      {event.source_url ? (
        <div className="rounded-lg overflow-hidden mb-3">
          <Microlink url={event.source_url} size="large" />
        </div>
      ) : (
        <div className="relative w-full h-48 mb-3 rounded-lg overflow-hidden">
          {previewImage ? (
            <Image
              src={previewImage}
              alt={event.title || "Lisbon Event"}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              style={{ objectFit: "cover" }}
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-[#f1e4d0] flex items-center justify-center text-[#b84b22]/70 text-sm italic">
              Loading image...
            </div>
          )}
        </div>
      )}

      {/* ✅ Content */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#b84b22] mb-1">
            {event.title}
          </h2>
          <p className="text-sm text-gray-700 mb-2">{formattedDate}</p>
          <p className="text-sm text-gray-800 mb-2">
            {event.venue ? `${event.venue}, ${event.city}` : event.city}
          </p>
          <p className="text-sm text-gray-600 line-clamp-3">
            {event.description || "No description available."}
          </p>
        </div>

        <div className="mt-3 text-sm text-gray-500 italic">
          {event.price && <span>💶 {event.price} &nbsp;</span>}
          {event.age && <span>🎟 {event.age}</span>}
        </div>
      </div>
    </div>
  );
}
