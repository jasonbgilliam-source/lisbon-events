"use client";

import React, { useEffect, useMemo, useState } from "react";

type Row = {
  day: string;
  slot_key: string;
  event_slug: string;
  event_title: string | null;
  advertiser_name: string | null;
  campaign_name: string | null;
  metric: string;
  total: number;
};

type SummarySlot = {
  slot_key: string;
  impressions: number;
  clicks: number;
  ctr: number; // 0..1
};

type SummaryCampaign = {
  campaign_name: string;
  impressions: number;
  clicks: number;
  ctr: number; // 0..1
};

type SummaryAdvertiser = {
  advertiser_name: string;
  impressions: number;
  clicks: number;
  ctr: number; // 0..1
};

type ApiResponse = {
  ok: boolean;
  from: string | null;
  to: string | null;
  totals: Record<string, number>;
  rows: Row[];
  slot_summary: SummarySlot[];
  campaign_summary: SummaryCampaign[];
  advertiser_summary: SummaryAdvertiser[];
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

function fmtPct(x: number) {
  if (!Number.isFinite(x)) return "0.00%";
  return `${(x * 100).toFixed(2)}%`;
}

function escCSV(v: any) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function downloadTextFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCSVAll(
  rows: Row[],
  slotSummary: SummarySlot[],
  advSummary: SummaryAdvertiser[],
  campSummary: SummaryCampaign[]
) {
  const lines: string[] = [];

  lines.push(escCSV("SLOT SUMMARY"));
  lines.push(["slot_key", "impressions", "clicks", "ctr"].map(escCSV).join(","));
  for (const s of slotSummary) {
    lines.push(
      [s.slot_key, s.impressions, s.clicks, fmtPct(s.ctr)].map(escCSV).join(",")
    );
  }

  lines.push("");

  lines.push(escCSV("ADVERTISER SUMMARY"));
  lines.push(["advertiser_name", "impressions", "clicks", "ctr"].map(escCSV).join(","));
  for (const a of advSummary) {
    lines.push(
      [a.advertiser_name, a.impressions, a.clicks, fmtPct(a.ctr)].map(escCSV).join(",")
    );
  }

  lines.push("");

  lines.push(escCSV("CAMPAIGN SUMMARY"));
  lines.push(["campaign_name", "impressions", "clicks", "ctr"].map(escCSV).join(","));
  for (const c of campSummary) {
    lines.push(
      [c.campaign_name, c.impressions, c.clicks, fmtPct(c.ctr)].map(escCSV).join(",")
    );
  }

  lines.push("");

  lines.push(escCSV("DETAIL ROWS"));
  const header = [
    "day",
    "slot_key",
    "event_slug",
    "event_title",
    "advertiser_name",
    "campaign_name",
    "metric",
    "total",
  ];
  lines.push(header.map(escCSV).join(","));
  for (const r of rows) {
    lines.push(
      [
        r.day,
        r.slot_key,
        r.event_slug,
        r.event_title,
        r.advertiser_name,
        r.campaign_name,
        r.metric,
        r.total,
      ]
        .map(escCSV)
        .join(",")
    );
  }

  return lines.join("\n");
}

function toCSVSlotInvoice(rows: Row[], slotKey: string) {
  // A compact invoice-style export: totals by event + metric, with CTR per event
  // We compute event-level impressions/clicks for the slot.
  const perEvent = new Map<
    string,
    {
      event_slug: string;
      event_title: string | null;
      advertiser_name: string | null;
      campaign_name: string | null;
      impressions: number;
      clicks: number;
    }
  >();

  for (const r of rows) {
    if (r.slot_key !== slotKey) continue;

    const key = `${r.event_slug}`;
    const cur =
      perEvent.get(key) || {
        event_slug: r.event_slug,
        event_title: r.event_title,
        advertiser_name: r.advertiser_name,
        campaign_name: r.campaign_name,
        impressions: 0,
        clicks: 0,
      };

    if (r.metric === "impression") cur.impressions += r.total || 0;
    if (r.metric === "click") cur.clicks += r.total || 0;

    // keep latest non-null labels
    cur.event_title = cur.event_title || r.event_title;
    cur.advertiser_name = cur.advertiser_name || r.advertiser_name;
    cur.campaign_name = cur.campaign_name || r.campaign_name;

    perEvent.set(key, cur);
  }

  const items = Array.from(perEvent.values()).sort(
    (a, b) => b.impressions - a.impressions
  );

  const lines: string[] = [];
  lines.push(escCSV(`SLOT INVOICE EXPORT: ${slotKey}`));
  lines.push(
    [
      "slot_key",
      "event_slug",
      "event_title",
      "advertiser_name",
      "campaign_name",
      "impressions",
      "clicks",
      "ctr",
    ]
      .map(escCSV)
      .join(",")
  );

  for (const e of items) {
    const ctr = e.impressions > 0 ? e.clicks / e.impressions : 0;
    lines.push(
      [
        slotKey,
        e.event_slug,
        e.event_title,
        e.advertiser_name,
        e.campaign_name,
        e.impressions,
        e.clicks,
        fmtPct(ctr),
      ]
        .map(escCSV)
        .join(",")
    );
  }

  lines.push("");
  lines.push(escCSV("DETAIL ROWS"));
  lines.push(
    [
      "day",
      "slot_key",
      "event_slug",
      "event_title",
      "advertiser_name",
      "campaign_name",
      "metric",
      "total",
    ]
      .map(escCSV)
      .join(",")
  );

  const detail = rows
    .filter((r) => r.slot_key === slotKey)
    .sort((a, b) => {
      if (a.day !== b.day) return a.day < b.day ? 1 : -1;
      if (a.metric !== b.metric) return a.metric < b.metric ? -1 : 1;
      return a.event_slug < b.event_slug ? -1 : 1;
    });

  for (const r of detail) {
    lines.push(
      [
        r.day,
        r.slot_key,
        r.event_slug,
        r.event_title,
        r.advertiser_name,
        r.campaign_name,
        r.metric,
        r.total,
      ]
        .map(escCSV)
        .join(",")
    );
  }

  return lines.join("\n");
}

export default function AdsReportsPage() {
  const [from, setFrom] = useState(daysAgoISO(14));
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [slotSummary, setSlotSummary] = useState<SummarySlot[]>([]);
  const [advSummary, setAdvSummary] = useState<SummaryAdvertiser[]>([]);
  const [campSummary, setCampSummary] = useState<SummaryCampaign[]>([]);

  const [hideUnknown, setHideUnknown] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/ads/reports/?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      const json = (await res.json()) as ApiResponse;
      if (json?.ok) {
        setRows(json.rows || []);
        setTotals(json.totals || {});
        setSlotSummary(json.slot_summary || []);
        setAdvSummary(json.advertiser_summary || []);
        setCampSummary(json.campaign_summary || []);
      } else {
        setRows([]);
        setTotals({});
        setSlotSummary([]);
        setAdvSummary([]);
        setCampSummary([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    if (!hideUnknown) return rows;
    return rows.filter((r) => r.slot_key !== "unknown");
  }, [rows, hideUnknown]);

  const filteredSlotSummary = useMemo(() => {
    if (!hideUnknown) return slotSummary;
    return slotSummary.filter((s) => s.slot_key !== "unknown");
  }, [slotSummary, hideUnknown]);

  const filteredAdvSummary = useMemo(() => advSummary, [advSummary]);
  const filteredCampSummary = useMemo(() => campSummary, [campSummary]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      if (a.day !== b.day) return a.day < b.day ? 1 : -1;
      if (a.slot_key !== b.slot_key) return a.slot_key < b.slot_key ? -1 : 1;
      if (a.metric !== b.metric) return a.metric < b.metric ? -1 : 1;
      return a.event_slug < b.event_slug ? -1 : 1;
    });
  }, [filteredRows]);

  const downloadAllCSV = () => {
    const csv = toCSVAll(sortedRows, filteredSlotSummary, filteredAdvSummary, filteredCampSummary);
    downloadTextFile(`ads_reports_${from}_to_${to}.csv`, csv);
  };

  const downloadSlotCSV = (slotKey: string) => {
    const csv = toCSVSlotInvoice(sortedRows, slotKey);
    downloadTextFile(`ads_invoice_${slotKey}_${from}_to_${to}.csv`, csv);
  };

  const impressions = totals.impression || 0;
  const clicks = totals.click || 0;
  const ctr = impressions > 0 ? clicks / impressions : 0;

  const other = Object.entries(totals)
    .filter(([k]) => k !== "impression" && k !== "click")
    .reduce((acc, [, v]) => acc + (v || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Ads Reports</h1>
          <p className="text-sm text-black/60 mt-1">
            Invoice-ready rollups (slot / advertiser / campaign) + detailed rows + CSV export.
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
            onClick={downloadAllCSV}
            className="px-4 py-2 rounded-lg border text-sm"
            disabled={loading || sortedRows.length === 0}
          >
            Export CSV
          </button>

          <label className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 bg-white">
            <input
              type="checkbox"
              checked={hideUnknown}
              onChange={(e) => setHideUnknown(e.target.checked)}
            />
            Hide “unknown”
          </label>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mt-6">
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-black/60">Impressions</div>
          <div className="text-2xl font-bold mt-1">{impressions}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-black/60">Clicks</div>
          <div className="text-2xl font-bold mt-1">{clicks}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-black/60">CTR</div>
          <div className="text-2xl font-bold mt-1">{fmtPct(ctr)}</div>
        </div>
        <div className="border rounded-xl p-4 bg-white">
          <div className="text-xs text-black/60">Other</div>
          <div className="text-2xl font-bold mt-1">{other}</div>
        </div>
      </div>

      {/* SLOT SUMMARY */}
      <div className="mt-6 border rounded-xl overflow-hidden bg-white">
        <div className="px-4 py-3 border-b text-sm font-semibold">
          Slot Summary ({filteredSlotSummary.length})
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-black/5">
              <tr>
                <th className="text-left px-4 py-2">Slot</th>
                <th className="text-right px-4 py-2">Impressions</th>
                <th className="text-right px-4 py-2">Clicks</th>
                <th className="text-right px-4 py-2">CTR</th>
                <th className="text-right px-4 py-2">Invoice CSV</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlotSummary.map((s) => (
                <tr key={s.slot_key} className="border-t">
                  <td className="px-4 py-2 whitespace-nowrap">{s.slot_key}</td>
                  <td className="px-4 py-2 text-right">{s.impressions}</td>
                  <td className="px-4 py-2 text-right">{s.clicks}</td>
                  <td className="px-4 py-2 text-right">{fmtPct(s.ctr)}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      className="px-3 py-1 rounded-lg border text-xs hover:bg-black/5"
                      onClick={() => downloadSlotCSV(s.slot_key)}
                      disabled={sortedRows.length === 0}
                    >
                      Export
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSlotSummary.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-black/60" colSpan={5}>
                    No slot summary rows.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADVERTISER SUMMARY */}
      <div className="mt-6 border rounded-xl overflow-hidden bg-white">
        <div className="px-4 py-3 border-b text-sm font-semibold">
          Advertiser Summary ({filteredAdvSummary.length})
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-black/5">
              <tr>
                <th className="text-left px-4 py-2">Advertiser</th>
                <th className="text-right px-4 py-2">Impressions</th>
                <th className="text-right px-4 py-2">Clicks</th>
                <th className="text-right px-4 py-2">CTR</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdvSummary.map((a) => (
                <tr key={a.advertiser_name} className="border-t">
                  <td className="px-4 py-2 whitespace-nowrap">{a.advertiser_name}</td>
                  <td className="px-4 py-2 text-right">{a.impressions}</td>
                  <td className="px-4 py-2 text-right">{a.clicks}</td>
                  <td className="px-4 py-2 text-right">{fmtPct(a.ctr)}</td>
                </tr>
              ))}
              {filteredAdvSummary.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-black/60" colSpan={4}>
                    No advertiser summary rows.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CAMPAIGN SUMMARY */}
      <div className="mt-6 border rounded-xl overflow-hidden bg-white">
        <div className="px-4 py-3 border-b text-sm font-semibold">
          Campaign Summary ({filteredCampSummary.length})
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-black/5">
              <tr>
                <th className="text-left px-4 py-2">Campaign</th>
                <th className="text-right px-4 py-2">Impressions</th>
                <th className="text-right px-4 py-2">Clicks</th>
                <th className="text-right px-4 py-2">CTR</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampSummary.map((c) => (
                <tr key={c.campaign_name} className="border-t">
                  <td className="px-4 py-2 whitespace-nowrap">{c.campaign_name}</td>
                  <td className="px-4 py-2 text-right">{c.impressions}</td>
                  <td className="px-4 py-2 text-right">{c.clicks}</td>
                  <td className="px-4 py-2 text-right">{fmtPct(c.ctr)}</td>
                </tr>
              ))}
              {filteredCampSummary.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-black/60" colSpan={4}>
                    No campaign summary rows.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL ROWS */}
      <div className="mt-6 border rounded-xl overflow-hidden bg-white">
        <div className="px-4 py-3 border-b text-sm font-semibold">
          Detail Rows ({sortedRows.length})
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-black/5">
              <tr>
                <th className="text-left px-4 py-2">Day</th>
                <th className="text-left px-4 py-2">Slot</th>
                <th className="text-left px-4 py-2">Event</th>
                <th className="text-left px-4 py-2">Advertiser</th>
                <th className="text-left px-4 py-2">Campaign</th>
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
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.event_title || r.event_slug}</div>
                    <div className="text-xs text-black/60">{r.event_slug}</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.advertiser_name || "—"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.campaign_name || "—"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{r.metric}</td>
                  <td className="px-4 py-2 text-right">{r.total}</td>
                </tr>
              ))}

              {sortedRows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-black/60" colSpan={7}>
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