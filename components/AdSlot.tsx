"use client";

import { useEffect, useMemo, useState } from "react";

type Props = { id: string };

type EventLite = {
  slug: string;
  title: string;
  starts_at?: string | null;
  location_name?: string | null;
  image_url?: string | null;
  price?: string | null;
};

type ResolveResponse = {
  ok: boolean;
  slot_key: string;
  picked: null | {
    id: string;
    slot_key: string;
    event_slug: string;
    weight: number;
    advertiser_name: string | null;
    campaign_name: string | null;
  };
};

const SLOT_TO_ENV_SLUG: Record<string, string | undefined> = {
  "home-top": process.env.NEXT_PUBLIC_AD_SLOT_home_top,
  "home-midfeed": process.env.NEXT_PUBLIC_AD_SLOT_home_midfeed,
  "home-rail-1": process.env.NEXT_PUBLIC_AD_SLOT_home_rail_1,
  "home-rail-2": process.env.NEXT_PUBLIC_AD_SLOT_home_rail_2,
  "discover-page": process.env.NEXT_PUBLIC_AD_SLOT_discover_page,
};

export default function AdSlot({ id }: Props) {
  const envSlug = useMemo(() => SLOT_TO_ENV_SLUG[id] || null, [id]);

  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null);
  const [event, setEvent] = useState<EventLite | null>(null);

  // 1) Resolve placement from DB (Phase 2). 2) Fallback to ENV if none.
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(`/api/ads/resolve/?slot_key=${encodeURIComponent(id)}`);
        const json = (await res.json()) as ResolveResponse;

        if (cancelled) return;

        if (json?.ok && json?.picked?.event_slug) {
          setResolvedSlug(json.picked.event_slug);
          return;
        }
      } catch {
        // ignore
      }

      if (!cancelled) setResolvedSlug(envSlug);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [id, envSlug]);

  // Fetch event details for rendering
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!resolvedSlug) return;
      try {
        const res = await fetch(
          `/api/events/by-slug/?slug=${encodeURIComponent(resolvedSlug)}`
        );
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
  }, [resolvedSlug]);

  // Track impression
  useEffect(() => {
    if (!resolvedSlug) return;

    fetch("/api/metrics/track/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metric: "impression",
        event_slug: resolvedSlug,
        page_path: window.location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        slot_key: id,
      }),
    });
  }, [resolvedSlug, id]);

  if (!resolvedSlug) return null;

  const handleClick = () => {
    fetch("/api/metrics/track/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metric: "click",
        event_slug: resolvedSlug,
        page_path: window.location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        slot_key: id,
      }),
    });
  };

  const title = event?.title || "Featured Event";
  const where = event?.location_name ? `📍 ${event.location_name}` : null;

  return (
    <div className="my-6">
      <a
        href={`/events/${resolvedSlug}`}
        onClick={handleClick}
        className="block p-4 border rounded-lg bg-yellow-50 hover:bg-yellow-100 transition"
      >
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
          Sponsored
        </div>
        <div className="font-semibold">{title}</div>
        {where ? <div className="text-sm text-gray-600 mt-1">{where}</div> : null}
      </a>
    </div>
  );
}