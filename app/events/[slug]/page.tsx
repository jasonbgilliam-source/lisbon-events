"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";

type EventItem = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  location_name?: string | null;
  address?: string | null;
  city?: string | null;
  price?: string | null;
  ticket_url?: string | null;

  // NEW preferred field
  audience?: string[] | null;

  // Legacy / optional restriction notes
  age?: string | null;

  category?: string | null;
  image_url?: string | null;
  source_folder?: string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  is_free?: boolean | null;

  latitude?: number | null;
  longitude?: number | null;
  normalized_address?: string | null;
};

function categoryKey(input: string) {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeAudienceValue(input: string) {
  const s = String(input || "").trim().toLowerCase();
  if (!s) return "";
  if (s === "all ages" || s === "all-ages") return "All Ages";
  if (s === "family") return "Family";
  if (s === "kids" || s === "children") return "Kids";
  if (s === "teens" || s === "teen") return "Teens";
  if (s === "adults" || s === "adult") return "Adults";
  return input;
}

function extractAudienceFromLegacyAge(age?: string | null): string[] {
  const raw = String(age || "").toLowerCase();
  if (!raw) return [];
  if (raw.includes("all ages") || raw.includes("all-ages")) return ["All Ages"];

  const hits: string[] = [];
  if (raw.includes("family")) hits.push("Family");
  if (raw.includes("kids") || raw.includes("children")) hits.push("Kids");
  if (raw.includes("teen")) hits.push("Teens");
  if (raw.includes("adult")) hits.push("Adults");
  return Array.from(new Set(hits));
}

function getDisplayAudience(e: EventItem): string[] {
  if (Array.isArray(e.audience) && e.audience.length > 0) {
    const out = e.audience.map(normalizeAudienceValue).filter(Boolean);
    return out.length > 0 ? out : ["All Ages"];
  }

  const legacy = extractAudienceFromLegacyAge(e.age);
  if (legacy.length > 0) return legacy;

  return ["All Ages"];
}

function getImage(e: EventItem) {
  if (e.image_url && e.source_folder) {
    return `/${e.source_folder.replace(/^\/+/, "")}/${e.image_url.replace(
      /^\/+/,
      ""
    )}`;
  }
  if (e.image_url?.startsWith("http")) return e.image_url;
  if (e.youtube_url) {
    const match = e.youtube_url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
    if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  }
  if (e.spotify_url) return "/images/spotify-cover.jpeg";
  if (e.category) return `/images/${categoryKey(e.category)}.jpeg`;
  return "/images/default.jpeg";
}

export default function EventDetailPage() {
  const params = useParams();
  const slug =
    typeof params?.slug === "string"
      ? params.slug
      : Array.isArray(params?.slug)
      ? params.slug[0]
      : "";

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      setLoading(true);
      setError(null);

      try {
        // Use the existing list endpoint and find the matching slug.
        const res = await fetch("/api/events/list/?limit=2000", {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(json?.error || `Failed to load events (${res.status})`);

        const items = Array.isArray(json?.items) ? (json.items as EventItem[]) : [];
        const found = items.find((x) => String(x.slug) === String(slug)) ?? null;

        if (!found) {
          setEvent(null);
          setError("Event not found.");
        } else {
          setEvent(found);
        }
      } catch (e: any) {
        console.error(e);
        setEvent(null);
        setError(e?.message ?? "Failed to load event.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  if (loading) {
    return (
      <section className="max-w-4xl mx-auto">
        <p>Loading event…</p>
      </section>
    );
  }

  if (error || !event) {
    return (
      <section className="max-w-4xl mx-auto">
        <p className="text-red-600">{error || "Event not found."}</p>
        <div className="mt-4">
          <Link href="/events" className="text-[#c94917] underline">
            ← Back to events
          </Link>
        </div>
      </section>
    );
  }

  const audience = getDisplayAudience(event);
  const when = event.starts_at
    ? dayjs(event.starts_at).format("ddd, MMM D, YYYY h:mm A")
    : "";
  const ends = event.ends_at ? dayjs(event.ends_at).format("h:mm A") : "";

  return (
    <section className="max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/events" className="text-[#c94917] underline">
          ← Back to events
        </Link>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <div className="relative w-full h-72">
          <Image
            src={getImage(event)}
            alt={event.title}
            fill
            className="object-cover"
          />
        </div>

        <div className="p-5 sm:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#c94917]">
            {event.title}
          </h1>

          <div className="mt-3 space-y-1 text-sm text-gray-800">
            {event.location_name && <p>📍 {event.location_name}</p>}
            {when && (
              <p>
                🕒 {when}
                {ends ? ` – ${ends}` : ""}
              </p>
            )}
            {event.city && <p>🏙️ {event.city}</p>}
            {event.address && <p>🗺️ {event.address}</p>}
            {event.is_free || (event.price || "").toLowerCase() === "free" ? (
              <p>💸 Free</p>
            ) : event.price ? (
              <p>💸 {event.price}</p>
            ) : null}
          </div>

          {/* Audience chips */}
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-600 mb-2">
              Audience
            </div>
            <div className="flex flex-wrap gap-2">
              {audience.map((a) => (
                <span
                  key={a}
                  className="px-2 py-0.5 text-xs rounded-full border border-orange-300 text-orange-800 bg-orange-50"
                >
                  {a}
                </span>
              ))}

              {/* If age contains non-audience restriction notes, show it as a grey tag */}
              {event.age &&
                !/all ages|all-ages|family|kids|children|teen|adult/i.test(
                  event.age
                ) && (
                  <span className="px-2 py-0.5 text-xs rounded-full border border-gray-200 text-gray-700 bg-gray-50">
                    {event.age}
                  </span>
                )}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="mt-5">
              <div className="text-xs font-semibold text-gray-600 mb-2">
                Details
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Links */}
          <div className="mt-6 flex flex-wrap gap-3">
            {event.ticket_url && (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-full bg-[#c94917] text-white text-sm font-semibold hover:bg-[#a53f12]"
              >
                Tickets / Info
              </a>
            )}
            {event.youtube_url && (
              <a
                href={event.youtube_url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-full border border-orange-300 text-[#c94917] text-sm font-semibold hover:bg-orange-50"
              >
                YouTube
              </a>
            )}
            {event.spotify_url && (
              <a
                href={event.spotify_url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-full border border-orange-300 text-[#c94917] text-sm font-semibold hover:bg-orange-50"
              >
                Spotify
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}