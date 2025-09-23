"use client";

import * as React from "react";

// ---- date helpers (no extra deps) ----
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toISODateOnly(d: Date) { return d.toISOString().slice(0, 10); } // YYYY-MM-DD
function startOfWeek(d: Date) {
  // Sunday as first day of week; adjust if you want Monday-first
  const nd = new Date(d); const day = nd.getDay();
  nd.setDate(nd.getDate() - day);
  nd.setHours(0, 0, 0, 0);
  return nd;
}
function endOfWeek(d: Date) {
  const nd = startOfWeek(d);
  nd.setDate(nd.getDate() + 6);
  return nd;
}
function formatMonthYear(d: Date) {
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}
function formatTime(dt?: string | null) {
  if (!dt) return "";
  const date = new Date(dt);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;   // ISO
  ends_at: string | null;
  category: string | null;
  location_name: string | null;
  city: string | null;
  address: string | null;
  ticket_url: string | null;
  image_url: string | null;
  all_day: boolean | null;
  age: string | null;
  organizer_email: string | null;
};

export default function CalendarPage() {
  const [cursor, setCursor] = React.useState<Date>(startOfMonth(new Date()));
  const [events, setEvents] = React.useState<EventRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<EventRow | null>(null);

  // Build visible 6-week grid for the current month
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    days.push(d);
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Ask API for events from the beginning of the grid to a bit past the end,
      // so multi-day / end times still appear.
      const from = new Date(gridStart);
      const to = new Date(gridEnd);
      // pad a day just in case
      to.setDate(to.getDate() + 1);

      const url = `/api/events/list?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
      const res = await fetch(url, { cache: "no-store" });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const t = await res.text();
        throw new Error(`Expected JSON from /api/events/list, got ${res.status}. First bytes: ${t.slice(0, 120)}`);
      }
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);
      setEvents((j.items || []) as EventRow[]);
    } catch (e: any) {
      setError(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  // reload when month changes
  React.useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cursor.getFullYear(), cursor.getMonth()]);

  // group by date (YYYY-MM-DD)
  const byDay = React.useMemo(() => {
    const m = new Map<string, EventRow[]>();
    for (const ev of events) {
      const dkey = toISODateOnly(new Date(ev.starts_at));
      const arr = m.get(dkey) || [];
      arr.push(ev);
      m.set(dkey, arr);
    }
    // sort each day's events by start time
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
      m.set(k, arr);
    }
    return m;
  }, [events]);

  function gotoToday() {
    setCursor(startOfMonth(new Date()));
  }
  function prevMonth() {
    setCursor(prev => addMonths(prev, -1));
  }
  function nextMonth() {
    setCursor(prev => addMonths(prev, 1));
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{formatMonthYear(cursor)}</h1>
        <div className="flex gap-2">
          <button className="border px-3 py-1 rounded" onClick={prevMonth}>← Prev</button>
          <button className="border px-3 py-1 rounded" onClick={gotoToday}>Today</button>
          <button className="border px-3 py-1 rounded" onClick={nextMonth}>Next →</button>
          <button className="border px-3 py-1 rounded" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p className="text-red-700 mb-3">Error: {error}</p>}

      {/* weekday header */}
      <div className="grid grid-cols-7 text-xs font-semibold text-gray-600 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="p-2">{d}</div>
        ))}
      </div>

      {/* month grid */}
      <div className="grid grid-cols-7 border rounded overflow-hidden">
        {days.map((d, i) => {
          const isOtherMonth = d.getMonth() !== cursor.getMonth();
          const isToday = sameDay(d, new Date());
          const key = toISODateOnly(d);
          const todays = byDay.get(key) || [];
          const maxShow = 3;
          const extra = Math.max(0, todays.length - maxShow);
          return (
            <div
              key={i}
              className={[
                "min-h-[110px] border-r border-b p-2 flex flex-col gap-1",
                (i % 7 === 6) ? "border-r-0" : "",
                (Math.floor(i / 7) === days.length / 7 - 1) ? "border-b-0" : "",
                isOtherMonth ? "bg-gray-50" : "bg-white",
              ].join(" ")}
            >
              <div className="text-xs flex items-center justify-between">
                <span className={isOtherMonth ? "text-gray-400" : ""}>{d.getDate()}</span>
                {isToday && <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700">Today</span>}
              </div>

              <div className="mt-1 flex-1 space-y-1">
                {todays.slice(0, maxShow).map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => setSelected(ev)}
                    className="w-full text-left text-xs truncate px-2 py-1 rounded border hover:bg-gray-50"
                    title={ev.title}
                  >
                    {ev.all_day ? "• " : `${formatTime(ev.starts_at)} · `}
                    <span className="font-medium">{ev.title}</span>
                    {ev.location_name ? ` @ ${ev.location_name}` : ""}
                  </button>
                ))}
                {extra > 0 && (
                  <button
                    onClick={() => setSelected({ ...todays[0] })}
                    className="text-[11px] text-blue-700 underline"
                    title={`+${extra} more`}
                  >
                    + {extra} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* details drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/20 flex items-end md:items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div
            className="bg-white w-full md:max-w-xl rounded-t-2xl md:rounded-2xl p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">{selected.title}</h2>
              <button className="border px-3 py-1 rounded" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {new Date(selected.starts_at).toLocaleString()}
              {selected.ends_at ? ` – ${new Date(selected.ends_at).toLocaleString()}` : ""}
              {selected.location_name ? ` @ ${selected.location_name}` : ""}
              {selected.city ? `, ${selected.city}` : ""}
            </div>
            {selected.category && <div className="text-xs mt-1">Category: {selected.category}</div>}
            {selected.age && <div className="text-xs">Age: {selected.age}</div>}
            {selected.description && <p className="mt-3 text-sm whitespace-pre-wrap">{selected.description}</p>}
            <div className="mt-3 flex gap-3 text-sm">
              {selected.ticket_url && (
                <a className="underline" href={selected.ticket_url} target="_blank" rel="noreferrer">Tickets</a>
              )}
              {selected.image_url && (
                <a className="underline" href={selected.image_url} target="_blank" rel="noreferrer">Image</a>
              )}
              {selected.organizer_email && (
                <a className="underline" href={`mailto:${selected.organizer_email}`} target="_blank" rel="noreferrer">Email organizer</a>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
