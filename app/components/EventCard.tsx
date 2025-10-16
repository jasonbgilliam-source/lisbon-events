"use client";
import React, { useEffect, useState } from "react";

interface Event {
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
  source_folder?: string;
  tags?: string;
  recurrence_note?: string;
}

export default function EventCard({ event }: { event: Event }) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fallbackImage = `/images/${event.category?.toLowerCase() || "default"}.jpg`;

  const date = new Date(event.start).toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  useEffect(() => {
    async function resolveImage() {
      let img = event.image_url?.trim() || "";

      // ✅ CASE 1: Local event image folder
      if (img && event.source_folder) {
        const cleanFolder = event.source_folder.replace(/^public\//, "");
        const cleanImage = img.replace(/^\/+/, "");
        img = `/${cleanFolder}/${cleanImage}`;
      }

      // ✅ CASE 2: YouTube thumbnail
      if (!img && event.youtube_url) {
        const match = event.youtube_url.match(
          /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/
        );
        if (match && match[1]) {
          img = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
        }
      }


      // ✅ CASE 3: Spotify placeholder
      if (!img && event.spotify_url) {
        img = "/images/spotify-placeholder.jpg";
      }

      // ✅ CASE 4: Microlink screenshot if we still have nothing
      if (!img && event.source_url) {
        try {
          const res = await fetch(
            `https://api.microlink.io?url=${encodeURIComponent(
              event.source_url
            )}&screenshot=true&meta=false`
          );
          const data = await res.json();
          if (data?.data?.screenshot?.url) {
            img = data.data.screenshot.url;
          }
        } catch {
          console.warn("Microlink fetch failed");
        }
      }

      // ✅ CASE 5: Fallback category image
      if (!img) {
        img = fallbackImage;
      }

      console.info("🖼️ Event image path resolved:", {
        title: event.title,
        image_url: event.image_url,
        source_folder: event.source_folder,
        resolved: img,
      });

      setPreviewImage(img);
    }

    resolveImage();
  }, [
    event.image_url,
    event.youtube_url,
    event.spotify_url,
    event.source_url,
    event.category,
    event.source_folder,
    fallbackImage,
  ]);

  return (
    <article className="rounded-2xl overflow-hidden shadow-md border border-[#f1e4d0] bg-[#fffaf5] transition hover:shadow-lg hover:-translate-y-1 duration-200">
      {/* ✅ Image */}
      {previewImage ? (
        <img
          src={previewImage}
          alt={event.title}
          className="w-full h-48 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackImage;
          }}
        />
      ) : (
        <div className="w-full h-48 bg-[#f1e4d0] flex items-center justify-center text-[#b84b22]/70 text-sm italic">
          Loading preview...
        </div>
      )}

      {/* ✅ Content */}
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

        {/* ✅ Expandable description */}
        <p
          className={`text-sm text-gray-700 mb-3 ${
            expanded ? "" : "line-clamp-3"
          }`}
        >
          {event.description || "No description provided."}
        </p>

        {event.description && event.description.length > 120 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[#b84b22] text-sm font-medium hover:text-[#8a351a] transition mb-2"
          >
            {expanded ? "Show less ▲" : "Read more ▼"}
          </button>
        )}

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
