import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type ResolveResponse = {
  event_slug: string | null;
  advertiser_name: string | null;
  campaign_name: string | null;
  candidate_count: number;
  campaign_id: string | null;
  placement_id: string | null;

  is_house?: boolean;
  house_title?: string;
  house_subtitle?: string;

  error?: string;
};

type NormalizedCandidate = {
  placement_id: string;
  event_slug: string | null;
  weight: number;

  campaign_id: string | null;
  campaign_name: string | null;
  advertiser_name: string | null;

  // NEW: per-campaign cap
  daily_cap: number | null;
};

function jsonNoStore(body: ResolveResponse, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

function pickWeighted(
  candidates: NormalizedCandidate[]
): NormalizedCandidate | null {
  const pool = candidates
    .map((c) => ({ c, w: typeof c.weight === "number" ? c.weight : 0 }))
    .filter((x) => x.w > 0);

  if (pool.length === 0) return null;

  const total = pool.reduce((a, b) => a + b.w, 0);
  if (total <= 0) return null;

  let r = Math.random() * total;
  for (const x of pool) {
    r -= x.w;
    if (r <= 0) return x.c;
  }
  return pool[pool.length - 1].c;
}

// Supabase sometimes returns relations as either an object or an array (depending on select)
function asOne<T>(v: any): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return v as T;
}

function normalizePlacementRow(row: any): NormalizedCandidate | null {
  const placement_id = typeof row?.id === "string" ? row.id : null;
  if (!placement_id) return null;

  const event_slug =
    typeof row?.event_slug === "string" ? row.event_slug : null;
  const weight = typeof row?.weight === "number" ? row.weight : 0;

  const campaign = asOne<{
    id?: any;
    name?: any;
    daily_cap?: any;
    advertisers?: any;
  }>(row?.ad_campaigns);

  const campaign_id = typeof campaign?.id === "string" ? campaign.id : null;
  const campaign_name =
    typeof campaign?.name === "string" ? campaign.name : null;

  const daily_cap =
    typeof campaign?.daily_cap === "number" ? campaign.daily_cap : null;

  const advertiser = asOne<{ name?: any }>(campaign?.advertisers);
  const advertiser_name =
    typeof advertiser?.name === "string" ? advertiser.name : null;

  return {
    placement_id,
    event_slug,
    weight,
    campaign_id,
    campaign_name,
    advertiser_name,
    daily_cap,
  };
}

function pickRandomSlug(rows: any[]): string | null {
  const slugs = (rows ?? [])
    .map((r) => (typeof r?.slug === "string" ? r.slug : null))
    .filter((s): s is string => !!s && s.length > 0);

  if (slugs.length === 0) return null;
  return slugs[Math.floor(Math.random() * slugs.length)];
}

// IMPORTANT: typed as SupabaseClient to avoid TS "never" inference without generated Database types.
async function pickHouseEventSlug(
  supabase: SupabaseClient,
  _slotKey: string
): Promise<string | null> {
  const nowIso = new Date().toISOString();

  // Tiered fallback strategy:
  // 1) approved + upcoming + slug
  // 2) approved + slug (any date)
  // 3) any event with slug
  {
    const { data, error } = await supabase
      .from("events")
      .select("slug")
      .eq("status", "approved")
      .gte("starts_at", nowIso)
      .not("slug", "is", null)
      .order("starts_at", { ascending: true })
      .limit(20);

    if (error) {
      console.warn("[ads/resolve] house tier1 query failed", error);
    } else {
      const slug = pickRandomSlug(data as any[]);
      if (slug) return slug;
    }
  }

  {
    const { data, error } = await supabase
      .from("events")
      .select("slug, starts_at")
      .eq("status", "approved")
      .not("slug", "is", null)
      .order("starts_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("[ads/resolve] house tier2 query failed", error);
    } else {
      const slug = pickRandomSlug(data as any[]);
      if (slug) return slug;
    }
  }

  {
    const { data, error } = await supabase
      .from("events")
      .select("slug, starts_at")
      .not("slug", "is", null)
      .order("starts_at", { ascending: false })
      .limit(80);

    if (error) {
      console.warn("[ads/resolve] house tier3 query failed", error);
    } else {
      const slug = pickRandomSlug(data as any[]);
      if (slug) return slug;
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slotKey = (url.searchParams.get("slot_key") || "").trim();
    if (!slotKey) {
      return jsonNoStore(
        {
          event_slug: null,
          advertiser_name: null,
          campaign_name: null,
          candidate_count: 0,
          campaign_id: null,
          placement_id: null,
          error: "Missing slot_key",
        },
        { status: 400 }
      );
    }

    const forceHouse = (url.searchParams.get("force_house") || "").trim() === "1";
    const anonId = (req.headers.get("x-le-anon") || "").trim() || null;

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return jsonNoStore(
        {
          event_slug: null,
          advertiser_name: null,
          campaign_name: null,
          candidate_count: 0,
          campaign_id: null,
          placement_id: null,
          error: "Supabase env missing",
        },
        { status: 500 }
      );
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const today = todayISO();

    // If force_house=1, bypass paid and return house (if possible)
    if (forceHouse) {
      const houseSlug = await pickHouseEventSlug(supabase, slotKey);
      return jsonNoStore(
        {
          is_house: true,
          event_slug: houseSlug ?? null,
          advertiser_name: "Lisbon Events",
          campaign_name: "House Backfill",
          house_title: "Featured Event",
          house_subtitle: "Want to appear here? Promote your event.",
          candidate_count: 0,
          campaign_id: null,
          placement_id: null,
        },
        { status: 200 }
      );
    }

    // Pull placements + campaign + advertiser (+ daily_cap)
    let q = supabase
      .from("ad_placements")
      .select(
        `
          id,
          event_slug,
          weight,
          start_date,
          end_date,
          slot_key,
          ad_campaigns (
            id,
            name,
            daily_cap,
            advertisers ( name )
          )
        `
      )
      .eq("slot_key", slotKey);

    // Placement date window enforcement
    q = q.or(`start_date.is.null,start_date.lte.${today}`);
    q = q.or(`end_date.is.null,end_date.gte.${today}`);

    const { data, error } = await q;
    if (error) {
      console.error("[ads/resolve] query error", error);
      return jsonNoStore(
        {
          event_slug: null,
          advertiser_name: null,
          campaign_name: null,
          candidate_count: 0,
          campaign_id: null,
          placement_id: null,
          error: "Resolver query failed",
        },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as any[];
    const normalized = rows
      .map(normalizePlacementRow)
      .filter((x): x is NormalizedCandidate => !!x);

    // Must have a real event_slug + campaign_id
    const cleaned = normalized.filter(
      (c) =>
        typeof c.event_slug === "string" &&
        c.event_slug.length > 0 &&
        typeof c.campaign_id === "string" &&
        c.campaign_id.length > 0
    );

    // Frequency cap exclusion (default cap = 3/day per anon+slot+campaign)
    const DEFAULT_CAP = 3;
    let eligible = cleaned;

    if (anonId && cleaned.length > 0) {
      const campaignIds = cleaned
        .map((c) => c.campaign_id)
        .filter((id): id is string => typeof id === "string");

      if (campaignIds.length > 0) {
        const { data: freqRows, error: freqErr } = await supabase
          .from("ad_frequency_daily")
          .select("campaign_id, impressions")
          .eq("day", today)
          .eq("anon_id", anonId)
          .eq("slot_key", slotKey)
          .in("campaign_id", campaignIds);

        if (freqErr) {
          console.warn("[ads/resolve] cap lookup failed (fail open)", freqErr);
        } else {
          // Build cap map per campaign from candidates
          const capByCampaign = new Map<string, number | null>();
          for (const c of cleaned) {
            if (typeof c.campaign_id === "string") {
              // If multiple placements share campaign, they share cap; first wins is fine.
              if (!capByCampaign.has(c.campaign_id)) {
                capByCampaign.set(c.campaign_id, c.daily_cap);
              }
            }
          }

          const capped = new Set<string>();
          for (const r of freqRows || []) {
            const cid = (r as any).campaign_id as string;
            const imp = (r as any).impressions as number;

            // NULL daily_cap => use default (matches your comment)
            const capFromCampaign = capByCampaign.get(cid);
            const cap =
              typeof capFromCampaign === "number" ? capFromCampaign : DEFAULT_CAP;

            if (
              typeof cid === "string" &&
              typeof imp === "number" &&
              imp >= cap
            ) {
              capped.add(cid);
            }
          }

          eligible = cleaned.filter((c) => !capped.has(c.campaign_id as string));
        }
      }
    }

    // Marketplace trick: HOUSE SEEDING
    const HOUSE_SEED_RATE = 0.12;
    const shouldSeedHouse = Math.random() < HOUSE_SEED_RATE;

    if (eligible.length > 0 && shouldSeedHouse) {
      const slug = await pickHouseEventSlug(supabase, slotKey);
      if (slug) {
        return jsonNoStore(
          {
            is_house: true,
            event_slug: slug,
            advertiser_name: "Lisbon Events",
            campaign_name: "House Backfill",
            house_title: "Featured Event",
            house_subtitle: "Want to appear here? Promote your event.",
            candidate_count: eligible.length,
            campaign_id: null,
            placement_id: null,
          },
          { status: 200 }
        );
      }
      // if no house slug found, fall through to paid
    }

    // Paid inventory
    if (eligible.length > 0) {
      const picked = pickWeighted(eligible) ?? eligible[0];
      return jsonNoStore(
        {
          event_slug: picked.event_slug ?? null,
          advertiser_name: picked.advertiser_name ?? null,
          campaign_name: picked.campaign_name ?? null,
          candidate_count: eligible.length,
          campaign_id: picked.campaign_id ?? null,
          placement_id: picked.placement_id ?? null,
        },
        { status: 200 }
      );
    }

    // Dynamic house backfill (no paid eligible)
    const houseSlug = await pickHouseEventSlug(supabase, slotKey);

    return jsonNoStore(
      {
        is_house: true,
        event_slug: houseSlug ?? null,
        advertiser_name: "Lisbon Events",
        campaign_name: "House Backfill",
        house_title: "Featured Event",
        house_subtitle: "Want to appear here? Promote your event.",
        candidate_count: 0,
        campaign_id: null,
        placement_id: null,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("[ads/resolve] unexpected error", e);
    return jsonNoStore(
      {
        event_slug: null,
        advertiser_name: null,
        campaign_name: null,
        candidate_count: 0,
        campaign_id: null,
        placement_id: null,
        error: "Unexpected resolver error",
      },
      { status: 500 }
    );
  }
}