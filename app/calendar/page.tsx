"use client";

import * as React from "react";
import FilterBar, { type FilterState } from "../components/FilterBar";

/* --------------------------- tiny date helpers --------------------------- */
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toISODateOnly(d: Date) { return d.toISOString().slice(0, 10); } // YYYY-MM-DD
function startOfWeek(d: Date, mondayFirst = false) {
  const nd = new Date(d);
  const dow = nd.getDay(); // 0=Sun
  const offset = mondayFirst ? (dow === 0 ? 6 : dow - 1) : dow;
  nd.setDate(nd.getDate() - offset);
  nd.setHours(0, 0, 0, 0);
  return nd;
}
function endOfWeek(d: Date, mondayFirst = false) {
  const s = startOfWeek(d, mondayFirst);
  const nd = new Date(s);
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

/* ------------------------------ data shapes ----------------------------- */
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

/* ------------------------------ main page -------------------------------- */
export default function CalendarPage() {
  // month cursor
  const [cursor, setCursor] = React.useState<Date>(startOfMonth(new Date()));

  // filters
  const [filters, setFilters] = React.useState<FilterState>({
    category: "",
    city: "",
    allAges: false,
    from: "",
    to: "",
  });

  // facet options (from the facets API)
  const [facetCats, setFacetCats] = React.useState<string[]>([]);
  const [facetCities, setFacetCities] = React.useState<string[]>([]);

  // data + ui state
  const [events, setEvents] = React.useState<EventRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<EventRow | null>(null);

  // calendar grid (6 weeks)
  const mondayFirst = false; // set true for Monday-first weeks
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, mondayFirst);
  const gridEnd = endOfWeek(monthEnd, mondayFirst);
  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    days.push(d);
  }

  // load facets (one-time on mount; you can add a refresh button if desired)
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/events/facets", { cache: "no-store" });
        const j = await res.json();
        if (res.ok) {
          setFacetCats(j.categories || []);
          setFacetCities(j.cities || []);
        } else {
          console.warn("facets error:", j.error || res.statusText);
        }
      } catch (e) {
        console.warn("facets failed:", e);
      }
    })();
  }, []);

  // fetch events for range + filters
  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Use explicit filter dates if set; else use visible grid range (pad by 1 day)
      const fromDate = filters.from ? new Date(filters.from + "T00:00:00") : new Date(gridStart);
      const toDate   = filters.to   ? new Date(filters.to   + "T23:59:59") : new Date(gridEnd);
      toDate.setDate(toDate.getDate() + 1);

      const params = new URLSearchParams({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      });
      if (filters.category.trim()) params.set("category", filters.category.trim());
      if (filters.city.trim()) params.set("city", filters.city.trim());
      if (filters.allAges) params.set("all_ages", "true");

      const res = await fetch(`/api/events/combined?${params.toString()}`, { cache: "no-store" });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const t = await res.text();
        throw new Error(`Expected JSON from /api/events/combined, got ${res.status}. First bytes: ${t.slice(0, 120)}`);
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

  // reload when month or filters change (debounced a bit)
  React.useEffect(() => {
    const id = setTimeout(() => { load(); }, 150);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.getFullYear(), cursor.getMonth(), filters.category, filters.city, filters.allAges, filters.from, filters.to]);

  // group events by day
  const byDay = React.useMemo(() => {
    const m = new Map<string, EventRow[]>();
    for (const ev of events) {
      const dkey = toISODateOnly(new Date(ev.starts_at));
      const arr = m.get(dkey) || [];
      arr.push(ev);
      m.set(dkey, arr);
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
      m.set(k, arr);
    }
    return m;
  }, [events]);

  function gotoToday() { setCursor(startOfMonth(new Date())); }
  function prevMonth() { setCursor(prev => addMonths(prev, -1)); }
  function nextMonth() { setCursor(prev => addMonths(prev, 1)); }
  function clearFilters() {
    setFilters({ category: "", city: "", allAges: false, from: "", to: "" });
  }

  return (
    <main className="p-6 max-w-7xl mx-auto">
      {/* header + month nav */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
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

      {/* Filter Bar - uses global facets for full pick lists */}
      <FilterBar
        value={filters}
        onChange={setFilters}
        onClear={clearFilters}
        categories={facetCats}
        cities={facetCities}
      />

      {error && <p className="text-red-700 mb-3">Error: {error}</p>}

      {/* weekday header */}
      <div className="grid grid-cols-7 text-xs font-semibold text-gray-600 mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
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
                "min-h-[120px] border-r border-b p-2 flex flex-col gap-1",
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
                  <div key={ev.id} className="w-full text-left text-xs truncate px-2 py-1 rounded border">
                    {ev.all_day ? "• " : `${formatTime(ev.starts_at)} · `}
                    <span className="font-medium">{ev.title}</span>
                    {ev.location_name ? ` @ ${ev.location_name}` : ""}
                  </div>
                ))}
                {extra > 0 && (
                  <span className="text-[11px] text-gray-600">+ {extra} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
