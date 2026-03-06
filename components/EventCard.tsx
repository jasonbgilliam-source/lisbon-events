"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

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
  audience?: string[] | string;
  category?: string;
  categories?: string[] | string;
  image_url?: string;
  source_url?: string;
  source_folder?: string;
  youtube_url?: string;
  spotify_url?: string;
  is_free?: boolean;
};

const AUDIENCE_ORDER = ["All Ages", "Family", "Kids", "Teens", "Adults"] as const;

function parsePgArrayString(v: string): string[] {
  return v
    .replace(/[{}"]/g, "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeAudience(aud?: string[] | string): string[] {
  if (!aud) return [];
  if (Array.isArray(aud)) return aud.map((x) => String(x).trim()).filter(Boolean);
  if (typeof aud === "string") {
    const s = aud.trim();
    if (!s) return [];
    if (s.startsWith("{") && s.endsWith("}")) return parsePgArrayString(s);
    if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean);
    return [s];
  }
  return [];
}

function getAudienceForDisplay(aud?: string[] | string): string[] {
  const raw = normalizeAudience(aud);
  if (raw.length === 0) return [];

  const set = new Set<string>();
  for (const v of raw) {
    const match = AUDIENCE_ORDER.find((x) => x.toLowerCase() === v.toLowerCase());
    set.add(match ?? v);
  }

  if (set.has("All Ages")) return ["All Ages"];

  const known: string[] = [];
  const unknown: string[] = [];
  for (const v of set) {
    if ((AUDIENCE_ORDER as readonly string[]).includes(v)) known.push(v);
    else unknown.push(v);
  }

  known.sort(
    (a, b) =>
      (AUDIENCE_ORDER as readonly string[]).indexOf(a) -
      (AUDIENCE_ORDER as readonly string[]).indexOf(b)
  );
  unknown.sort((a, b) => a.localeCompare(b));

  return [...known, ...unknown];
}

const LISBON_DATE_TIME = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Europe/Lisbon",
});

function formatLisbonDateTime(d?: string) {
  if (!d) return "";
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? d : LISBON_DATE_TIME.format(x);
}

export default function EventCard({ e }: { e: EventItem }) {
  const [expanded, setExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("/images/default.jpeg");

  useEffect(() => {
    function getImage(): string {
      if (e.image_url && e.source_folder) {
        const folder = e.source_folder.replace(/^\.?\/*/, "");
        const filename = e.image_url.replace(/^\.?\/*/, "");
        return `/${folder}${folder.endsWith("/") ? "" : "/"}${filename}`;
      }

      if (e.image_url && e.image_url.startsWith("http")) return e.image_url;

      if (e.youtube_url) {
        const m = e.youtube_url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (m) return `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`;
      }

      if (e.spotify_url) return "/images/spotify-cover.jpeg";

      let catName: string | undefined;
      if (e.category && typeof e.category === "string" && e.category.trim() !== "") {
        catName = e.category;
      } else if (Array.isArray(e.categories) && e.categories.length > 0) {
        catName = e.categories[0];
      } else if (typeof e.categories === "string" && e.categories.includes("{")) {
        const arr = parsePgArrayString(e.categories);
        if (arr.length > 0) catName = arr[0];
      }

      if (catName) {
        return `/images/${catName.toLowerCase().replace(/\s+/g, "-")}.jpeg`;
      }

      return "/images/default.jpeg";
    }

    setPreviewImage(getImage());
  }, [
    e.image_url,
    e.source_folder,
    e.youtube_url,
    e.spotify_url,
    e.category,
    e.categories,
  ]);

  const start = e.starts_at || e.start;
  const end = e.ends_at || e.end;
  const loc = e.location_name || e.venue;
  const audience = getAudienceForDisplay(e.audience);

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
          onError={() => setPreviewImage("/images/default.jpeg")}
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
          🕒 {formatLisbonDateTime(start)}
          {end ? ` – ${formatLisbonDateTime(end)}` : ""}
        </p>

        {e.price ? (
          <p className="text-sm text-gray-700 mb-1">💶 {e.price}</p>
        ) : (
          <p className="text-sm text-green-700 font-medium mb-1">🆓 Free</p>
        )}

        {audience.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {audience.map((a) => (
              <span
                key={a}
                className="bg-orange-50 text-[#c94917] text-xs font-semibold px-2 py-1 rounded-full border border-orange-200"
              >
                {a}
              </span>
            ))}
          </div>
        )}

        {e.age && <p className="text-sm text-gray-700 mt-2">🔞 {e.age}</p>}

        {e.description && (
          <p
            className={`text-sm text-gray-700 mt-2 transition-all duration-300 ${
              expanded ? "line-clamp-none" : "line-clamp-2"
            }`}
          >
            {e.description}
          </p>
        )}

        {Array.isArray(e.categories) && e.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {e.categories.map((cat: string) => (
              <Link
                key={cat}
                href={`/categories/${cat.toLowerCase().replace(/\s+/g, "-")}`}
                className="bg-orange-100 text-[#c94917] text-xs font-medium px-2 py-1 rounded-full hover:bg-orange-200 transition"
                onClick={(ev) => ev.stopPropagation()}
              >
                {cat}
              </Link>
            ))}
          </div>
        )}

        {expanded && (
          <div className="mt-3 flex flex-wrap gap-3">
            {e.youtube_url && (
              <a
                href={e.youtube_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[#c94917] underline"
                onClick={(ev) => ev.stopPropagation()}
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
                onClick={(ev) => ev.stopPropagation()}
              >
                🎵 Spotify
              </a>
            )}

            {e.source_url && (
              <a
                href={e.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[#c94917] underline"
                onClick={(ev) => ev.stopPropagation()}
              >
                🔗 Source
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}