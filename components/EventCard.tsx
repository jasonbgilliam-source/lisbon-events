"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";

export type EventItem = {
  id?: string | number;
  title: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  start?: string;
  end?: string;
  location_name?: string;
  venue?: string;
  address?: string;
  city?: string;
  price?: string;
  age?: string;
  category?: string;
  image_url?: string;
  source_url?: string;
  source_folder?: string;
  youtube_url?: string;
  spotify_url?: string;
  is_free?: boolean;
};

export default function EventCard({ e }: { e: EventItem }) {
  const [expanded, setExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("/images/default.jpeg");

  // 🖼️ Pick the best image source
  useEffect(() => {
    async function pickImage() {
      if (e.image_url && e.image_url.trim() !== "") {
        setPreviewImage(e.image_url);
        return;
      }
      if (e.youtube_url) {
        const m = e.youtube_url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (m) {
          setPreviewImage(`https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`);
          return;
        }
      }
      if (e.spotify_url) {
        setPreviewImage("/images/spotify-cover.jpeg");
        return;
      }
      if (e.source_url) {
        try {
          const res = await fetch(
            `https://api.microlink.io?url=${encodeURIComponent(
              e.source_url
            )}&screenshot=true&meta=false`
          );
          const data = await res.json();
          if (data?.data?.screenshot?.url) {
            setPreviewImage(data.data.screenshot.url);
            return;
          }
        } catch {
          // ignore
        }
      }
      if (e.category) {
        const base = `/images/${e.category.toLowerCase().replace(/\s+/g, "-")}`;
        setPreviewImage(`${base}.jpeg`);
        return;
      }
      setPreviewImage("/images/default.jpeg");
    }
    pickImage();
  }, [e.image_url, e.youtube_url, e.spotify_url, e.source_url, e.category]);

  const handleImageError = (ev: React.SyntheticEvent<HTMLImageElement>) => {
    const target = ev.target as HTMLImageElement;
    target.src = "/images/default.jpeg";
  };

  const formatDate = (d?: string) =>
    d ? dayjs(d).format("ddd, MMM D, YYYY h:mm A") : "";

  const start = e.starts_at || e.start;
  const end = e.ends_at || e.end;
  const loc = e.location_name || e.venue;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className={`flex flex-col sm:flex-row bg-white border border-orange-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer ${
        expanded ? "scale-[1.02] bg-orange-50" : ""
      }`}
    >
      <div className="relative w-full sm:w-56 h-40 sm:h-auto">
        <Image
          src={previewImage}
          alt={e.title}
          fill
          className="object-cover"
          onError={handleImageError}
        />
      </div>

      <div className="flex-1 p-5">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-xl font-semibold text-[#c94917]">{e.title}</h2>
          <span
            className={`text-[#c94917] text-lg transform transition-transform duration-300 ${
              expanded ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        </div>

        <p className="text-sm text-gray-700 mb-1">📍 {loc || "Location TBA"}</p>
        <p className="text-sm text-gray-700 mb-1">
          🕒 {formatDate(start)}
          {end ? ` – ${formatDate(end)}` : ""}
        </p>
        {e.price ? (
          <p className="text-sm text-gray-700 mb-1">💶 {e.price}</p>
        ) : (
          <p className="text-sm text-green-700 font-medium mb-1">🆓 Free</p>
        )}
        {e.age && <p className="text-sm text-gray-700 mb-1">🔞 {e.age}</p>}

        {e.description && (
          <p
            className={`text-sm text-gray-700 mt-2 transition-all duration-300 ${
              expanded ? "line-clamp-none" : "line-clamp-2"
            }`}
          >
            {e.description}
          </p>
        )}

        {expanded && (
          <div className="mt-3 flex flex-wrap gap-3">
            {e.youtube_url && (
              <a
                href={e.youtube_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[#c94917] underline"
              >
                🎥 YouTube
              </a>
            )}
            {e.spotify_url && (
              <a
                href={e.spotify_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[#c94917] underline"
              >
                🎵 Spotify
              </a>
            )}
            {e.address && (
              <Link
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  e.address
                )}`}
                target="_blank"
                className="text-sm text-[#c94917] underline"
              >
                🗺️ Map
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
