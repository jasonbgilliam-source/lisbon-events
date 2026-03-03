"use client";

import React, { useEffect, useMemo, useState } from "react";

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

function uniq(arr: string[]) {
  return Array.from(new Set(arr)).sort();
}

export default function PlacementsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [slotFilter, setSlotFilter] = useState<string>("");

  async function load() {
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotFilter]);

  const slots = useMemo(() => uniq(items.map((i) => i.slot_key)), [items]);

  const updatePlacement = async (id: string, patch: { active?: boolean; weight?: number }) => {
    // optimistic UI
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } as Item : p))
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
      // revert by reload (simple + safe)
      await load();
      alert(`Update failed: ${json?.error || "unknown error"}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Ad Placements</h1>
          <p className="text-sm text-black/60 mt-1">
            Manage DB-driven placements (weights, active toggles). ENV fallback still applies
            when no placement exists for a slot.
          </p>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex flex-col">
            <label className="text-xs text-black/60">Slot</label>
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
            onClick={load}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm"
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

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
                            x.id === p.id ? ({ ...x, weight: Number(e.target.value) } as Item) : x
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