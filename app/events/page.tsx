"use client";

import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import dayjs from "dayjs";
import FilterBar, { type EventFilters } from "@/components/FilterBar";
import EmptyState from "@/components/EmptyState";
import FavoriteButton from "../../components/FavoriteButton";

const SPONSORED_EVENT_SLUGS = new Set<string>([
  // "my-sponsor-event-slug",
]);

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
  audience?: string[] | null;
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
  if (Array.isArray(e.audience) && e.audience.length > 0) {
    const keys = e.audience.map(normalizeAudienceValue).filter(Boolean);
    return keys.length > 0 ? keys : ["all ages"];
  }

  const legacy = extractAudienceFromLegacyAge(e.age);
  if (legacy.length > 0) return legacy;

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
  if (keys.includes("all ages")) return ["all ages"];

  const uniq = Array.from(new Set(keys.map(normalizeAudienceValue).filter(Boolean)));
  return uniq.sort((a, b) => audienceChipOrder(a) - audienceChipOrder(b));
}

function toTime(s?: string | null) {
  const t = s ? new Date(s).getTime() : NaN;
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
}

function trackMetric(payload: { metric: "impression" | "click"; event_slug: string; page_path: string }) {
  try {
    const body = JSON.stringify({
      ...payload,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent || null,
    });

    const url = "/api/metrics/track";

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }

    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

function hasActiveFilters(filters: EventFilters) {
  return (
    filters.search.trim() !== "" ||
    filters.categories.length > 0 ||
    filters.audience.length > 0 ||
    filters.is_free
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilters>({
    search: "",
    categories: [],
    audience: [],
    is_free: false,
  });

  const impressedSlugsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/events/list/?limit=500", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `Failed to load events (${res.status})`);

        const rows = pickEvents(json);
        setEvents(rows);
      } catch (e: any) {
        setEvents([]);
        setError(e?.message ?? "Failed to load events");
        console.error("Events load error:", e);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  const availableCategories = useMemo(() => {
    return Array.from(
      new Set(
        events
          .map((e) => String(e.category || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    if (filters.search) {
      const term = String(filters.search).toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title?.toLowerCase().includes(term) ||
          (e.description || "").toLowerCase().includes(term) ||
          (e.location_name || "").toLowerCase().includes(term)
      );
    }

    const selectedKeys = filters.categories.map(categoryKey);

    if (selectedKeys.length > 0) {
      filtered = filtered.filter((e) => selectedKeys.includes(categoryKey(e.category || "")));
    }

    if (filters.audience.length > 0) {
      const selected = filters.audience.map(normalizeAudienceValue).filter(Boolean);

      if (!selected.includes("all ages")) {
        filtered = filtered.filter((e) => {
          const aud = getAudienceKeys(e);
          if (aud.includes("all ages")) return true;
          return selected.some((a) => aud.includes(a));
        });
      }
    }

    if (filters.is_free) {
      filtered = filtered.filter(
        (e) => e.is_free === true || (e.price || "").toLowerCase() === "free"
      );
    }

    return filtered;
  }, [events, filters]);

  const showPromoRows = !hasActiveFilters(filters);

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

  const sponsoredEvents = useMemo(() => {
    return [...events]
      .filter((e) => SPONSORED_EVENT_SLUGS.has(String(e.slug || "")))
      .sort((a, b) => toTime(a.starts_at) - toTime(b.starts_at));
  }, [events]);

  const featuredEvents = useMemo(() => {
    const hasPromo = (e: EventItem) => Boolean(e.image_url || e.youtube_url || e.spotify_url);

    return [...events]
      .filter((e) => !SPONSORED_EVENT_SLUGS.has(String(e.slug || "")))
      .filter((e) => hasPromo(e))
      .sort((a, b) => toTime(a.starts_at) - toTime(b.starts_at))
      .slice(0, 6);
  }, [events]);

  useEffect(() => {
    if (!showPromoRows || sponsoredEvents.length === 0) return;

    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-sponsored-slug]"));
    if (els.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const slug = (entry.target as HTMLElement).dataset.sponsoredSlug;
          if (!slug) continue;

          if (!impressedSlugsRef.current.has(slug)) {
            impressedSlugsRef.current.add(slug);
            trackMetric({ metric: "impression", event_slug: slug, page_path: window.location.pathname });
          }
        }
      },
      { threshold: 0.6 }
    );

    els.forEach((el) => obs.observe(el));

    return () => obs.disconnect();
  }, [sponsoredEvents, showPromoRows]);

  const renderEventRowCard = (e: EventItem) => {
    const audKeys = getAudienceForCard(e);

    return (
      <div key={e.id} className="relative">
        <Link
          href={`/events/${encodeURIComponent(e.slug)}`}
          className="flex bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md"
        >
          <div className="relative w-56 h-40">
            <Image src={getImage(e)} alt={e.title} fill className="object-cover" />
          </div>

          <div className="flex-1 p-4 pr-20">
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

        <div className="absolute right-4 top-4 z-10">
          <FavoriteButton slug={e.slug} showLabel={false} />
        </div>
      </div>
    );
  };

  const renderPromoCard = (e: EventItem, label: "Sponsored" | "Featured") => {
    const audKeys = getAudienceForCard(e);
    const isSponsored = label === "Sponsored";

    return (
      <div key={e.id} className="relative min-w-[260px] max-w-[260px]">
        <Link
          href={`/events/${encodeURIComponent(e.slug)}`}
          className="group block rounded-2xl border bg-white shadow-sm hover:shadow-md overflow-hidden"
          data-sponsored-slug={isSponsored ? e.slug : undefined}
          onClick={() => {
            if (isSponsored) {
              trackMetric({ metric: "click", event_slug: e.slug, page_path: window.location.pathname });
            }
          }}
        >
          <div className="relative h-36 w-full">
            <Image src={getImage(e)} alt={e.title} fill className="object-cover" />

            <div className="absolute left-3 top-3">
              <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#c94917] shadow-sm border border-orange-200">
                {label}
              </span>
            </div>
          </div>

          <div className="p-3">
            <div className="text-sm text-neutral-600">{formatDate(e.starts_at) || "Date TBA"}</div>
            <div className="mt-1 line-clamp-2 font-semibold text-[#c94917] group-hover:underline">
              {e.title}
            </div>
            <div className="mt-1 text-sm text-neutral-700">📍 {e.location_name || "Location TBA"}</div>

            <div className="mt-2 flex flex-wrap gap-2">
              {audKeys.slice(0, 2).map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-orange-200 bg-orange-50 text-[#c94917]"
                  title="Audience"
                >
                  {titleCaseAudienceKey(k)}
                </span>
              ))}
            </div>
          </div>
        </Link>

        <div className="absolute right-3 top-3 z-10">
          <FavoriteButton slug={e.slug} showLabel={false} />
        </div>
      </div>
    );
  };

  return (
    <section className="max-w-5xl mx-auto">
      <Suspense fallback={<p className="text-center italic">Loading filters…</p>}>
        <FilterBar
          value={filters}
          onChange={setFilters}
          availableCategories={availableCategories}
        />
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
        <div className="mt-6">
          {showPromoRows && sponsoredEvents.length > 0 ? (
            <div className="mb-8">
              <div className="mb-3">
                <h2 className="text-lg font-semibold text-neutral-900">Sponsored Events</h2>
                <p className="text-sm text-neutral-600">Paid placements. Guaranteed visibility.</p>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2">
                {sponsoredEvents.map((e) => renderPromoCard(e, "Sponsored"))}
              </div>
            </div>
          ) : null}

          {showPromoRows && featuredEvents.length > 0 ? (
            <div className="mb-8">
              <div className="mb-3">
                <h2 className="text-lg font-semibold text-neutral-900">Editor’s Picks</h2>
                <p className="text-sm text-neutral-600">Highlighted events with good visuals (for now).</p>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2">
                {featuredEvents.map((e) => renderPromoCard(e, "Featured"))}
              </div>
            </div>
          ) : null}

          <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-gray-700">
            Hearts are saved on this device only.
          </div>

          <div className="flex flex-col gap-6">{filteredEvents.map(renderEventRowCard)}</div>
        </div>
      )}
    </section>
  );
}
