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

type HouseAd = {
  url: string;
  title: string;
  subtitle?: string | null;
};

const SLOT_TO_ENV_SLUG: Record<string, string | undefined> = {
  "home-top": process.env.NEXT_PUBLIC_AD_SLOT_home_top,
  "home-midfeed": process.env.NEXT_PUBLIC_AD_SLOT_home_midfeed,
  "home-rail-1": process.env.NEXT_PUBLIC_AD_SLOT_home_rail_1,
  "home-rail-2": process.env.NEXT_PUBLIC_AD_SLOT_home_rail_2,
  "discover-page": process.env.NEXT_PUBLIC_AD_SLOT_discover_page,
};

const STICKY_TTL_MS = 30 * 60 * 1000; // 30 minutes

function safeGetSession(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetSession(key: string, value: string) {
  try {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(key, value);
  } catch {}
}

function safeRemoveSession(key: string) {
  try {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(key);
  } catch {}
}

function oncePerSession(key: string) {
  try {
    const full = `le_once:${key}`;
    if (typeof window === "undefined") return false;
    if (window.sessionStorage.getItem(full) === "1") return false;
    window.sessionStorage.setItem(full, "1");
    return true;
  } catch {
    return true;
  }
}

type StickyValue =
  | {
      kind: "event";
      slug: string;
      expires_at: number;
      campaign_id?: string | null;
      placement_id?: string | null;
    }
  | {
      kind: "house";
      expires_at: number;
      house_url: string;
      house_title: string;
      house_subtitle?: string | null;
    };

function getSticky(slotKey: string): StickyValue | null {
  const raw = safeGetSession(`le_adpick:${slotKey}`);
  if (!raw) return null;

  try {
    const v = JSON.parse(raw) as StickyValue;

    if (!v?.expires_at) return null;
    if (Date.now() > v.expires_at) return null;

    if (v.kind === "event") {
      if (!("slug" in v) || !v.slug) return null;
      return v;
    }

    if (v.kind === "house") {
      if (!("house_url" in v) || !v.house_url) return null;
      if (!("house_title" in v) || !v.house_title) return null;
      return v;
    }

    return null;
  } catch {
    return null;
  }
}

function setSticky(slotKey: string, v: StickyValue) {
  safeSetSession(`le_adpick:${slotKey}`, JSON.stringify(v));
}

function getAnonId(): string | null {
  try {
    if (typeof window === "undefined") return null;
    const k = "le_anon_id";
    const existing = window.localStorage.getItem(k);
    if (existing) return existing;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `anon_${Math.random().toString(16).slice(2)}_${Date.now()}`;

    window.localStorage.setItem(k, id);
    return id;
  } catch {
    return null;
  }
}

export default function AdSlot({ id }: Props) {
  const envFallbackSlug = useMemo(() => SLOT_TO_ENV_SLUG[id] || null, [id]);

  const [slug, setSlug] = useState<string | null>(null);
  const [event, setEvent] = useState<EventLite | null>(null);

  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [placementId, setPlacementId] = useState<string | null>(null);

  const [house, setHouse] = useState<HouseAd | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const anonId = getAnonId();

      // reset view state
      if (!cancelled) {
        setSlug(null);
        setEvent(null);
        setCampaignId(null);
        setPlacementId(null);
        setHouse(null);
      }

      // 1) sticky
      const sticky = getSticky(id);
      if (sticky) {
        if (sticky.kind === "event") {
          if (!cancelled) {
            setSlug(sticky.slug);
            setCampaignId(sticky.campaign_id ?? null);
            setPlacementId(sticky.placement_id ?? null);
            setHouse(null);
          }
          return;
        }

        if (sticky.kind === "house") {
          if (!cancelled) {
            setHouse({
              url: sticky.house_url,
              title: sticky.house_title,
              subtitle: sticky.house_subtitle ?? null,
            });
            setSlug(null);
            setCampaignId(null);
            setPlacementId(null);
          }
          return;
        }
      }

      // 2) resolver
      try {
        const res = await fetch(
          `/api/ads/resolve/?slot_key=${encodeURIComponent(id)}`,
          { headers: anonId ? { "x-le-anon": anonId } : undefined }
        );
        const json = await res.json();

        // House fallback from resolver
        if (json?.is_house) {
          const houseUrl: string = typeof json?.house_url === "string" ? json.house_url : "/advertise";
          const houseTitle: string =
            typeof json?.house_title === "string" ? json.house_title : "Promote your event";
          const houseSubtitle: string | null =
            typeof json?.house_subtitle === "string" ? json.house_subtitle : null;

          setSticky(id, {
            kind: "house",
            expires_at: Date.now() + STICKY_TTL_MS,
            house_url: houseUrl,
            house_title: houseTitle,
            house_subtitle: houseSubtitle,
          });

          if (!cancelled) {
            setHouse({ url: houseUrl, title: houseTitle, subtitle: houseSubtitle });
            setSlug(null);
            setCampaignId(null);
            setPlacementId(null);
          }
          return;
        }

        // Normal event ad
        const pickedSlug: string | null = json?.event_slug || null;
        const pickedCampaignId: string | null = json?.campaign_id || null;
        const pickedPlacementId: string | null = json?.placement_id || null;

        if (pickedSlug) {
          setSticky(id, {
            kind: "event",
            slug: pickedSlug,
            expires_at: Date.now() + STICKY_TTL_MS,
            campaign_id: pickedCampaignId,
            placement_id: pickedPlacementId,
          });

          if (!cancelled) {
            setSlug(pickedSlug);
            setCampaignId(pickedCampaignId);
            setPlacementId(pickedPlacementId);
            setHouse(null);
          }
          return;
        }
      } catch {
        // ignore
      }

      // 3) ENV fallback (event slug)
      if (envFallbackSlug) {
        setSticky(id, {
          kind: "event",
          slug: envFallbackSlug,
          expires_at: Date.now() + STICKY_TTL_MS,
          campaign_id: null,
          placement_id: null,
        });

        if (!cancelled) {
          setSlug(envFallbackSlug);
          setCampaignId(null);
          setPlacementId(null);
          setHouse(null);
        }
      } else {
        if (!cancelled) {
          setSlug(null);
          setCampaignId(null);
          setPlacementId(null);
          setHouse(null);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [id, envFallbackSlug]);

  // Fetch event details only for event ads
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!slug) return;
      if (house) return;

      try {
        const res = await fetch(
          `/api/events/by-slug/?slug=${encodeURIComponent(slug)}`
        );
        const json = await res.json();

        if (!cancelled && json?.ok && json?.item) {
          setEvent(json.item);
          return;
        }

        // slug invalid, clear sticky
        safeRemoveSession(`le_adpick:${id}`);
        if (!cancelled) {
          setSlug(null);
          setEvent(null);
          setCampaignId(null);
          setPlacementId(null);
          setHouse(null);
        }
      } catch {
        // ignore
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [slug, id, house]);

  // Impression tracking (event ads only)
  useEffect(() => {
    if (!slug) return;
    if (house) return; // sponsor_metrics.event_slug is NOT NULL; house has no slug

    const anonId = getAnonId();
    const page_path = window.location.pathname;
    const key = `impr:${id}:${slug}:${page_path}`;

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
        anon_id: anonId,
        campaign_id: campaignId,
        placement_id: placementId,
      }),
    }).catch(() => {});
  }, [slug, id, campaignId, placementId, house]);

  if (!slug && !house) return null;

  // Click tracking (event ads only)
  const handleClickEvent = () => {
    if (!slug) return;
    if (house) return;

    const anonId = getAnonId();
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
        anon_id: anonId,
        campaign_id: campaignId,
        placement_id: placementId,
      }),
    }).catch(() => {});
  };

  // House render
  if (house) {
    return (
      <div className="my-6">
        <a
          href={house.url || "/advertise"}
          className="block p-4 border rounded-lg bg-yellow-50 hover:bg-yellow-100 transition"
        >
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            Sponsored
          </div>
          <div className="font-semibold">{house.title || "Promote your event"}</div>
          {house.subtitle ? (
            <div className="text-sm text-gray-600 mt-1">{house.subtitle}</div>
          ) : null}
        </a>
      </div>
    );
  }

  // Event render (existing UI)
  const title = event?.title || "Featured Event";
  const where = event?.location_name ? `📍 ${event.location_name}` : null;

  return (
    <div className="my-6">
      <a
        href={`/events/${slug}`}
        onClick={handleClickEvent}
        className="block p-4 border rounded-lg bg-yellow-50 hover:bg-yellow-100 transition"
      >
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
          Sponsored
        </div>
        <div className="font-semibold">{title}</div>
        {where && <div className="text-sm text-gray-600 mt-1">{where}</div>}
      </a>
    </div>
  );
}