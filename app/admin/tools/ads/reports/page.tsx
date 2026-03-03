"use client";

import React, { useEffect, useMemo, useState } from "react";

type Row = {
  day: string;
  slot_key: string;
  event_slug: string;
  metric: string;
  total: number;
};

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toCSV(rows: Row[]) {
  const header = ["day", "slot_key", "event_slug", "metric", "total"];
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [header.map(esc).join(",")];
  for (const r of rows) {
    lines.push([r.day, r.slot_key, r.event_slug, r.metric, r.total].map(esc).join(","));
  }
  return lines.join("\n");
}

export default function AdsReportsPage() {
  const [from, setFrom] = useState(daysAgoISO(14));
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/ads/reports/?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      const json = await res.json();
      if (json?.ok) {
        setRows(json.rows || []);
        setTotals(json.totals || {});
      } else {
        setRows([]);
        setTotals({});
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.day !== b.day) return a.day < b.day ? 1 : -1;
      if (a.slot_key !== b.slot_key) return a.slot_key < b.slot_key ? -1 : 1;
      if (a.metric !== b.metric) return a.metric < b.metric ? -1 : 1;
      return a.event_slug < b.event_slug ? -1 : 1;
    });
  }, [rows]);

  const downloadCSV = () => {
    const csv = toCSV(sortedRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ads_reports_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const impressions = totals.impression || 0;
  const clicks = totals.click || 0;
  const other = Object.entries(totals)
    .filter(([k]) => k !== "impression" && k !== "click")
    .reduce((acc, [, v]) => acc + (v || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Ads Reports</h1>
          <p className="text-sm text-black/60 mt-1">
            Metrics from{" "}
            <code className="px-1 py-0.5 rounded bg-black/5">ad_metrics_daily</code>
          </p>
        </div>

        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex flex-col">
            <label className="text-xs text-black/60">From</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm bg-white"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-black/60">To</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm bg-white"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm"
            disabled={loading}
          >
            {loading ? "Loading…" : "Run"}
          </button>
          <button
            onClick={downloadCSV}
            className="px-4 py-2 rounded-lg border text-sm"
            disabled={loading || sortedRows.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-6">
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-black/60">Impressions</div>
          <div className="text-2xl font-bold mt-1">{impressions}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-black/60">Clicks</div>
          <div className="text-2xl font-bold mt-1">{clicks}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-black/60">Other</div>
          <div className="text-2xl font-bold mt-1">{other}</div>
        </div>
      </div>

      <div className="mt-6 border rounded-xl overflow-hidden bg-white">
        <div className="px-4 py-3 border-b text-sm font-semibold">
          Breakdown ({sortedRows.length} rows)
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-black/5">
              <tr>
                <th className="text-left px-4 py-2">Day</th>
                <th className="text-left px-4 py-2">Slot</th>
                <th className="text-left px-4 py-2">Slug</th>
                <th className="text-left px-4 py-2">Metric</th>
                <th className="text-right px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {new Date(r.day).toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{r.slot_key}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{r.event_slug}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{r.metric}</td>
                  <td className="px-4 py-2 text-right">{r.total}</td>
                </tr>
              ))}
              {sortedRows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-black/60" colSpan={5}>
                    No rows for this date range.
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