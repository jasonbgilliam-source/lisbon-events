"use client";

import { useEffect, useMemo, useState } from "react";

type Props = { id: string }; // slot key (e.g. home-top)

type EventLite = {
  slug: string;
  title: string;
  starts_at?: string | null;
  location_name?: string | null;
  image_url?: string | null;
  price?: string | null;
};

const SLOT_TO_SLUG: Record<string, string | undefined> = {
  "home-top": process.env.NEXT_PUBLIC_AD_SLOT_home_top,
  "home-midfeed": process.env.NEXT_PUBLIC_AD_SLOT_home_midfeed,
  "home-rail-1": process.env.NEXT_PUBLIC_AD_SLOT_home_rail_1,
  "home-rail-2": process.env.NEXT_PUBLIC_AD_SLOT_home_rail_2,
  "discover-page": process.env.NEXT_PUBLIC_AD_SLOT_discover_page,
};

function oncePerSession(key: string) {
  try {
    const full = `le_once:${key}`;
    if (typeof window === "undefined") return false;
    if (window.sessionStorage.getItem(full) === "1") return false;
    window.sessionStorage.setItem(full, "1");
    return true;
  } catch {
    // If storage is blocked (privacy mode), fall back to sending (better than losing metrics entirely)
    return true;
  }
}

export default function AdSlot({ id }: Props) {
  const slug = useMemo(() => SLOT_TO_SLUG[id] || null, [id]);
  const [event, setEvent] = useState<EventLite | null>(null);

  // Fetch event details for rendering (optional)
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!slug) return;
      try {
        const res = await fetch(`/api/events/by-slug/?slug=${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (!cancelled && json?.ok && json?.item) setEvent(json.item);
      } catch {
        // ignore
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Track impression once per session per page+slot+slug
  useEffect(() => {
    if (!slug) return;

    const page_path = window.location.pathname;
    const key = `impr:${id}:${slug}:${page_path}`;

    // Only send once per session for this unique combo
    if (!oncePerSession(key)) return;

    fetch("/api/metrics/track/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metric: "impression",
        event_slug: slug,
        page_path,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        slot_key: id,
      }),
    }).catch(() => {});
  }, [slug, id]);

  if (!slug) return null;

  const handleClick = () => {
    const page_path = window.location.pathname;

    fetch("/api/metrics/track/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metric: "click",
        event_slug: slug,
        page_path,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        slot_key: id,
      }),
    }).catch(() => {});
  };

  const title = event?.title || "Featured Event";
  const where = event?.location_name ? `📍 ${event.location_name}` : null;

  return (
    <div className="my-6">
      <a
        href={`/events/${slug}`}
        onClick={handleClick}
        className="block p-4 border rounded-lg bg-yellow-50 hover:bg-yellow-100 transition"
      >
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Sponsored</div>
        <div className="font-semibold">{title}</div>
        {where && <div className="text-sm text-gray-600 mt-1">{where}</div>}
      </a>
    </div>
  );
}