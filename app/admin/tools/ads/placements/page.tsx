"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  slot_key: string;
  event_slug: string;
  event_title: string | null;
  advertiser_name: string | null;
  campaign_name: string | null;
  campaign_active: boolean | null;
  weight: number;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

type Campaign = {
  id: string;
  name: string;
  active: boolean;
  advertiser_id: string | null;
  advertiser_name: string | null;
};

type EventHit = {
  slug: string;
  title: string | null;
  starts_at: string | null;
  location_name: string | null;
};

function uniq(arr: string[]) {
  return Array.from(new Set(arr)).sort();
}

const COMMON_SLOTS = [
  "home-top",
  "home-midfeed",
  "home-rail-1",
  "home-rail-2",
  "discover-page",
];

export default function PlacementsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [slotFilter, setSlotFilter] = useState<string>("");

  // Create form state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [createCampaignId, setCreateCampaignId] = useState<string>("");
  const [createSlotMode, setCreateSlotMode] = useState<"common" | "other">("common");
  const [createSlotCommon, setCreateSlotCommon] = useState<string>(COMMON_SLOTS[0]);
  const [createSlotOther, setCreateSlotOther] = useState<string>("");
  const [createWeight, setCreateWeight] = useState<number>(100);
  const [createActive, setCreateActive] = useState<boolean>(true);
  const [createStart, setCreateStart] = useState<string>("");
  const [createEnd, setCreateEnd] = useState<string>("");

  // Event search/typeahead
  const [eventQuery, setEventQuery] = useState("");
  const [eventHits, setEventHits] = useState<EventHit[]>([]);
  const [eventSlug, setEventSlug] = useState("");
  const [eventSelectedLabel, setEventSelectedLabel] = useState<string>("");
  const [searchingEvents, setSearchingEvents] = useState(false);
  const searchTimer = useRef<number | null>(null);

  const effectiveCreateSlot =
    createSlotMode === "common" ? createSlotCommon : createSlotOther.trim();

  async function loadPlacements() {
    setLoading(true);
    try {
      const url = slotFilter
        ? `/api/admin/ads/placements/?slot_key=${encodeURIComponent(slotFilter)}`
        : `/api/admin/ads/placements/`;
      const res = await fetch(url);
      const json = await res.json();
      setItems(json?.ok ? (json.items || []) : []);
    } finally {
      setLoading(false);
    }
  }

  async function loadCampaigns() {
    const res = await fetch("/api/admin/ads/campaigns/");
    const json = await res.json();
    const list = json?.ok ? (json.items || []) : [];
    setCampaigns(list);

    // default selection
    if (!createCampaignId && list.length > 0) {
      setCreateCampaignId(list[0].id);
    }
  }

  useEffect(() => {
    loadPlacements();
    loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPlacements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotFilter]);

  const slots = useMemo(() => uniq(items.map((i) => i.slot_key)), [items]);

  const updatePlacement = async (
    id: string,
    patch: { active?: boolean; weight?: number }
  ) => {
    // optimistic UI
    setItems((prev) =>
      prev.map((p) => (p.id === id ? ({ ...p, ...patch } as Item) : p))
    );

    const res = await fetch("/api/admin/ads/placements/update/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-le-csrf": "1",
      },
      body: JSON.stringify({ id, ...patch }),
    });

    const json = await res.json();
    if (!json?.ok) {
      await loadPlacements();
      alert(`Update failed: ${json?.error || "unknown error"}`);
    }
  };

  const searchEvents = async (q: string) => {
    const query = q.trim();
    if (query.length < 2) {
      setEventHits([]);
      return;
    }

    setSearchingEvents(true);
    try {
      const res = await fetch(
        `/api/admin/ads/events/search/?q=${encodeURIComponent(query)}`
      );
      const json = await res.json();
      setEventHits(json?.ok ? (json.items || []) : []);
    } finally {
      setSearchingEvents(false);
    }
  };

  const onEventQueryChange = (v: string) => {
    setEventQuery(v);

    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      searchEvents(v);
    }, 250);
  };

  const pickEvent = (e: EventHit) => {
    setEventSlug(e.slug);
    setEventSelectedLabel(e.title ? `${e.title} (${e.slug})` : e.slug);
    setEventQuery(e.title || e.slug);
    setEventHits([]);
  };

  const createPlacement = async () => {
    if (!createCampaignId) return alert("Pick a campaign first.");
    if (!effectiveCreateSlot) return alert("Provide a slot key.");
    if (!eventSlug) return alert("Pick an event from search results first.");

    const payload = {
      campaign_id: createCampaignId,
      slot_key: effectiveCreateSlot,
      event_slug: eventSlug,
      weight: Number.isFinite(createWeight) ? createWeight : 100,
      active: createActive,
      start_date: createStart ? createStart : null,
      end_date: createEnd ? createEnd : null,
    };

    const res = await fetch("/api/admin/ads/placements/create/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-le-csrf": "1",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!json?.ok) {
      return alert(`Create failed: ${json?.error || "unknown error"}`);
    }

    // reset selected event
    setEventSlug("");
    setEventSelectedLabel("");
    setEventQuery("");
    setEventHits([]);

    await loadPlacements();
    alert("Placement created.");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Ad Placements</h1>
          <p className="text-sm text-black/60 mt-1">
            Manage DB-driven placements (weights, active toggles, windows). ENV fallback
            still applies when no placement exists for a slot.
          </p>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex flex-col">
            <label className="text-xs text-black/60">Filter Slot</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm bg-white"
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value)}
            >
              <option value="">All</option>
              {slots.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={loadPlacements}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm"
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* CREATE */}
      <div className="mt-6 border rounded-xl bg-white p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-semibold">Create Placement</div>
            <div className="text-xs text-black/60 mt-1">
              Select a campaign, choose a slot, search and pick an event, set weight/window.
            </div>
          </div>
          <button
            onClick={createPlacement}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm"
          >
            Create
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-3 mt-4">
          <div className="flex flex-col">
            <label className="text-xs text-black/60">Campaign</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm bg-white"
              value={createCampaignId}
              onChange={(e) => setCreateCampaignId(e.target.value)}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.advertiser_name ? `${c.advertiser_name} — ` : "") +
                    c.name +
                    (c.active ? "" : " (inactive)")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black/60">Slot</label>
            <div className="flex gap-2">
              <select
                className="border rounded-lg px-3 py-2 text-sm bg-white"
                value={createSlotMode}
                onChange={(e) => setCreateSlotMode(e.target.value as any)}
              >
                <option value="common">Common</option>
                <option value="other">Other…</option>
              </select>

              {createSlotMode === "common" ? (
                <select
                  className="border rounded-lg px-3 py-2 text-sm bg-white flex-1"
                  value={createSlotCommon}
                  onChange={(e) => setCreateSlotCommon(e.target.value)}
                >
                  {COMMON_SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="border rounded-lg px-3 py-2 text-sm bg-white flex-1"
                  placeholder="e.g. home-top"
                  value={createSlotOther}
                  onChange={(e) => setCreateSlotOther(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black/60">Weight</label>
            <input
              type="number"
              min={0}
              className="border rounded-lg px-3 py-2 text-sm bg-white"
              value={createWeight}
              onChange={(e) => setCreateWeight(Number(e.target.value))}
            />
          </div>

          <div className="flex flex-col md:col-span-2">
            <label className="text-xs text-black/60">Event (search + pick)</label>
            <div className="relative">
              <input
                className="border rounded-lg px-3 py-2 text-sm bg-white w-full"
                placeholder="Type to search events by title or slug…"
                value={eventQuery}
                onChange={(e) => onEventQueryChange(e.target.value)}
              />
              {searchingEvents ? (
                <div className="absolute right-3 top-2.5 text-xs text-black/50">
                  Searching…
                </div>
              ) : null}

              {eventHits.length > 0 && (
                <div className="absolute z-50 mt-2 w-full rounded-xl border bg-white shadow-lg overflow-hidden">
                  {eventHits.map((e) => (
                    <button
                      key={e.slug}
                      className="w-full text-left px-3 py-2 hover:bg-black/5"
                      onClick={() => pickEvent(e)}
                    >
                      <div className="text-sm font-medium">
                        {e.title || e.slug}
                      </div>
                      <div className="text-xs text-black/60">
                        {e.slug}
                        {e.location_name ? ` • ${e.location_name}` : ""}
                        {e.starts_at ? ` • ${new Date(e.starts_at).toISOString().slice(0, 10)}` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-xs text-black/60 mt-1">
              Selected:{" "}
              <span className="font-medium">
                {eventSelectedLabel || "—"}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black/60">Active</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm bg-white"
              value={createActive ? "true" : "false"}
              onChange={(e) => setCreateActive(e.target.value === "true")}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black/60">Start date (optional)</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm bg-white"
              value={createStart}
              onChange={(e) => setCreateStart(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-black/60">End date (optional)</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm bg-white"
              value={createEnd}
              onChange={(e) => setCreateEnd(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="mt-6 border rounded-xl overflow-hidden bg-white">
        <div className="px-4 py-3 border-b text-sm font-semibold">
          Placements ({items.length})
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-black/5">
              <tr>
                <th className="text-left px-4 py-2">Slot</th>
                <th className="text-left px-4 py-2">Event</th>
                <th className="text-left px-4 py-2">Advertiser</th>
                <th className="text-left px-4 py-2">Campaign</th>
                <th className="text-left px-4 py-2">Campaign Active</th>
                <th className="text-left px-4 py-2">Weight</th>
                <th className="text-left px-4 py-2">Active</th>
                <th className="text-left px-4 py-2">Window</th>
              </tr>
            </thead>

            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2 whitespace-nowrap">{p.slot_key}</td>

                  <td className="px-4 py-2">
                    <div className="font-medium">{p.event_title || p.event_slug}</div>
                    <div className="text-xs text-black/60">{p.event_slug}</div>
                  </td>

                  <td className="px-4 py-2 whitespace-nowrap">
                    {p.advertiser_name || "—"}
                  </td>

                  <td className="px-4 py-2 whitespace-nowrap">
                    {p.campaign_name || "—"}
                  </td>

                  <td className="px-4 py-2 whitespace-nowrap">
                    {p.campaign_active === null ? "—" : p.campaign_active ? "Yes" : "No"}
                  </td>

                  <td className="px-4 py-2 whitespace-nowrap">
                    <input
                      type="number"
                      min={0}
                      className="border rounded-lg px-2 py-1 w-24"
                      value={p.weight ?? 0}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === p.id
                              ? ({ ...x, weight: Number(e.target.value) } as Item)
                              : x
                          )
                        )
                      }
                      onBlur={(e) => updatePlacement(p.id, { weight: Number(e.target.value) })}
                    />
                  </td>

                  <td className="px-4 py-2 whitespace-nowrap">
                    <button
                      className={`px-3 py-1 rounded-lg border text-xs ${
                        p.active ? "bg-green-50" : "bg-red-50"
                      }`}
                      onClick={() => updatePlacement(p.id, { active: !p.active })}
                    >
                      {p.active ? "Active" : "Inactive"}
                    </button>
                  </td>

                  <td className="px-4 py-2 whitespace-nowrap text-xs text-black/70">
                    {(p.start_date || "—") + " → " + (p.end_date || "—")}
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-black/60" colSpan={8}>
                    No placements found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}