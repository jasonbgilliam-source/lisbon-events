"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import dayjs from "dayjs";
import FilterBar from "@/components/FilterBar";
import EmptyState from "@/components/EmptyState";

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
};

function pickEvents(json: any): EventItem[] {
  const arr =
    json?.events ??
    json?.data ??
    json?.items ??
    json?.rows ??
    (Array.isArray(json) ? json : null);

  return Array.isArray(arr) ? (arr as EventItem[]) : [];
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
  if (s === "all ages" || s === "all-ages") return "all ages";
  if (s === "family") return "family";
  if (s === "kids" || s === "children") return "kids";
  if (s === "teens" || s === "teen") return "teens";
  if (s === "adults" || s === "adult") return "adults";
  return s;
}

function extractAudienceFromLegacyAge(age?: string | null): string[] {
  const raw = String(age || "").toLowerCase();
  if (!raw) return [];
  if (raw.includes("all ages") || raw.includes("all-ages")) return ["all ages"];

  const hits: string[] = [];
  if (raw.includes("family")) hits.push("family");
  if (raw.includes("kids") || raw.includes("children")) hits.push("kids");
  if (raw.includes("teen")) hits.push("teens");
  if (raw.includes("adult")) hits.push("adults");
  return Array.from(new Set(hits));
}

function getAudienceKeys(e: EventItem): string[] {
  // Prefer structured audience array
  if (Array.isArray(e.audience) && e.audience.length > 0) {
    const keys = e.audience.map(normalizeAudienceValue).filter(Boolean);
    return keys.length > 0 ? keys : ["all ages"];
  }

  // Fall back to legacy age text if it contains audience words
  const legacy = extractAudienceFromLegacyAge(e.age);
  if (legacy.length > 0) return legacy;

  // CRITICAL DEFAULT:
  // If we have no audience info, treat as "All Ages" so filters don't hide everything.
  return ["all ages"];
}

function titleCaseAudienceKey(key: string) {
  const k = normalizeAudienceValue(key);
  if (k === "all ages") return "All Ages";
  if (k === "family") return "Family";
  if (k === "kids") return "Kids";
  if (k === "teens") return "Teens";
  if (k === "adults") return "Adults";
  return key;
}

function audienceChipOrder(a: string) {
  const k = normalizeAudienceValue(a);
  if (k === "all ages") return 0;
  if (k === "family") return 1;
  if (k === "kids") return 2;
  if (k === "teens") return 3;
  if (k === "adults") return 4;
  return 99;
}

function getAudienceForCard(e: EventItem): string[] {
  const keys = getAudienceKeys(e);

  // If it’s All Ages, show only that chip (cleaner)
  if (keys.includes("all ages")) return ["all ages"];

  // Otherwise show distinct, ordered keys
  const uniq = Array.from(new Set(keys.map(normalizeAudienceValue).filter(Boolean)));
  return uniq.sort((a, b) => audienceChipOrder(a) - audienceChipOrder(b));
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/events/list/?limit=500", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error || `Failed to load events (${res.status})`);
        }

        const rows = pickEvents(json);
        setEvents(rows);
        setFilteredEvents(rows);
      } catch (e: any) {
        setEvents([]);
        setFilteredEvents([]);
        setError(e?.message ?? "Failed to load events");
        console.error("Events load error:", e);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  const handleFilter = (filters: any) => {
    let filtered = [...events];

    // Search
    if (filters.search) {
      const term = String(filters.search).toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title?.toLowerCase().includes(term) ||
          (e.description || "").toLowerCase().includes(term) ||
          (e.location_name || "").toLowerCase().includes(term)
      );
    }

    // Categories
    const selectedKeys =
      filters.category_keys?.length > 0
        ? filters.category_keys
        : (filters.categories || []).map(categoryKey);

    if (selectedKeys.length > 0) {
      filtered = filtered.filter((e) => {
        const key = categoryKey(e.category || "");
        return selectedKeys.includes(key);
      });
    }

    // Audience
    if (filters.audience && filters.audience.length > 0) {
      const selected = (filters.audience as string[])
        .map(normalizeAudienceValue)
        .filter(Boolean);

      // If "All Ages" is selected, treat it as "no audience filtering"
      if (!selected.includes("all ages")) {
        filtered = filtered.filter((e) => {
          const aud = getAudienceKeys(e);

          // Event "All Ages" matches any selected audience filter
          if (aud.includes("all ages")) return true;

          return selected.some((a) => aud.includes(a));
        });
      }
    }

    // Free
    if (filters.is_free || filters.isFree) {
      filtered = filtered.filter(
        (e) => e.is_free === true || (e.price || "").toLowerCase() === "free"
      );
    }

    setFilteredEvents(filtered);
  };

  const formatDate = (dateStr?: string | null) =>
    dateStr ? dayjs(dateStr).format("ddd, MMM D, YYYY h:mm A") : "";

  const getImage = (e: EventItem) => {
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
  };

  return (
    <section className="max-w-5xl mx-auto">
      <Suspense fallback={<p className="text-center italic">Loading filters…</p>}>
        <FilterBar onFilter={handleFilter} />
      </Suspense>

      {error ? (
        <p className="text-red-600">{error}</p>
      ) : loading ? (
        <p>Loading events…</p>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="No events match your filters"
          description="Try clearing filters, changing categories/audience, or searching a different keyword."
        />
      ) : (
        <div className="flex flex-col gap-6 mt-8">
          {filteredEvents.map((e) => {
            const audKeys = getAudienceForCard(e);

            return (
              <Link
                key={e.id}
                href={`/events/${encodeURIComponent(e.slug)}`}
                className="flex bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md"
              >
                <div className="relative w-56 h-40">
                  <Image src={getImage(e)} alt={e.title} fill className="object-cover" />
                </div>

                <div className="flex-1 p-4">
                  <h3 className="text-xl font-semibold text-[#c94917]">{e.title}</h3>
                  <p>📍 {e.location_name || "Location TBA"}</p>
                  <p>🕒 {formatDate(e.starts_at)}</p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {audKeys.map((k) => (
                      <span
                        key={k}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-orange-200 bg-orange-50 text-[#c94917]"
                        title="Audience"
                      >
                        {titleCaseAudienceKey(k)}
                      </span>
                    ))}

                    {e.age && !/all ages|all-ages|family|kids|children|teen|adult/i.test(e.age) && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-gray-200 bg-gray-50 text-gray-700"
                        title="Age restriction / notes"
                      >
                        {e.age}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}