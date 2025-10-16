"use client";
import React, { useEffect, useState } from "react";

type EventProps = {
  event: {
    title: string;
    start: string;
    end?: string;
    venue?: string;
    city?: string;
    address?: string;
    price?: string;
    age?: string;
    category?: string;
    description?: string;
    organizer?: string;
    source_url?: string;
    image_url?: string;        // e.g. "unnamed(13).jpg"
    source_folder?: string;    // e.g. "Gmail-Lisboa-Events-05_10_2025-19_10_2025_files"
    youtube_url?: string;
    spotify_url?: string;
  };
};

export default function EventCard({ event }: EventProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const startDate = new Date(event.start);
  const formattedDate = startDate.toLocaleDateString("en-PT", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // ✅ Category fallback
  const fallbackImage = `/images/${event.category?.toLowerCase() || "default"}.jpg`;

  useEffect(() => {
    let img = "";

    // ✅ 1. Try local image (preferred)
    if (event.image_url && event.source_folder) {
      const safeFolder = event.source_folder.replace(/\s+/g, "-");
      const safeFile = event.image_url.split("/").pop();
      img = `/event-images/${safeFolder}/${safeFile}`;
    }

    // ✅ 2. YouTube preview if no local image
    if (!img && event.youtube_url) {
      const match = event.youtube_url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/
      );
      if (match) img = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }

    // ✅ 3. Spotify fallback
    if (!img && event.spotify_url) {
      img = "/images/spotify-placeholder.jpg";
    }

    // ✅ 4. Category fallback
    if (!img) {
      img = fallbackImage;
    }

    setPreviewImage(img);
  }, [
    event.image_url,
    event.source_folder,
    event.youtube_url,
    event.spotify_url,
    event.category,
    fallbackImage,
  ]);

  return (
    <div className="bg-[#fff8f3] border border-[#e1a46e] rounded-2xl shadow-sm hover:shadow-md transition p-4 flex flex-col">
      {/* ✅ Image */}
      <div className="relative w-full h-48 mb-3 rounded-lg overflow-hidden">
        {previewImage ? (
          <img
            src={previewImage}
            alt={event.title || "Lisbon Event"}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackImage;
            }}
          />
        ) : (
          <div className="w-full h-full bg-[#f1e4d0] flex items-center justify-center text-[#b84b22]/70 text-sm italic">
            Loading image...
          </div>
        )}
      </div>

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

        {event.source_url && (
          <a
            href={event.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-[#b84b22] hover:text-[#8a351a] font-medium transition"
          >
            View Details →
          </a>
        )}
      </div>
    </div>
  );
}
