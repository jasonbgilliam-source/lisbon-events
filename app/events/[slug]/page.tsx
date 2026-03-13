"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import FavoriteButton from "../../../components/FavoriteButton";
import EventStaticMap from "@/components/EventStaticMap";

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
  audience?: string[] | null;
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

function formatLisbonDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : LISBON_DATE_TIME.format(d);
}

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
    return `/${e.source_folder.replace(/^\/+/, "")}/${e.image_url.replace(/^\/+/, "")}`;
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

function hasMapData(e: EventItem) {
  return (
    (typeof e.latitude === "number" && typeof e.longitude === "number") ||
    Boolean(e.location_name || e.city)
  );
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
        const res = await fetch(`/api/events/by-slug?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json?.error || `Failed to load event (${res.status})`);
        }

        const item = json?.item ?? null;
        if (!item) {
          setEvent(null);
          setError("Event not found.");
        } else {
          setEvent(item);
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
  const when = formatLisbonDateTime(event.starts_at);
  const ends = formatLisbonDateTime(event.ends_at);
  const showMap = hasMapData(event);

  return (
    <section className="max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/events" className="text-[#c94917] underline">
          ← Back to events
        </Link>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <div className="relative w-full h-72">
          <Image src={getImage(event)} alt={event.title} fill className="object-cover" />
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#c94917]">
              {event.title}
            </h1>

            <FavoriteButton slug={event.slug} />
          </div>

          <div className="mt-2 text-xs text-gray-500">Saved on this device</div>

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

          {showMap ? (
            <div className="mt-6 border rounded-xl bg-gray-50 px-4 py-4">
              <EventStaticMap
                latitude={event.latitude}
                longitude={event.longitude}
                location_name={event.location_name}
                city={event.city}
              />
            </div>
          ) : null}

          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-600 mb-2">Audience</div>
            <div className="flex flex-wrap gap-2">
              {audience.map((a) => (
                <span
                  key={a}
                  className="px-2 py-0.5 text-xs rounded-full border border-orange-300 text-orange-800 bg-orange-50"
                >
                  {a}
                </span>
              ))}

              {event.age &&
                !/all ages|all-ages|family|kids|children|teen|adult/i.test(event.age) && (
                  <span className="px-2 py-0.5 text-xs rounded-full border border-gray-200 text-gray-700 bg-gray-50">
                    {event.age}
                  </span>
                )}
            </div>
          </div>

          {event.description && (
            <div className="mt-5">
              <div className="text-xs font-semibold text-gray-600 mb-2">Details</div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {event.ticket_url ? (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-lg bg-[#c94917] px-4 py-2 text-white hover:opacity-90"
              >
                Tickets / RSVP
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
