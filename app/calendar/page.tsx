"use client";

import * as React from "react";
import FilterBar, { type FilterState } from "../components/FilterBar";
import EventCard, { type EventRow } from "../components/EventCard";

/* date helpers (unchanged) */
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toISODateOnly(d: Date) { return d.toISOString().slice(0, 10); }
function startOfWeek(d: Date, mondayFirst = false) {
  const nd = new Date(d); const dow = nd.getDay();
  const offset = mondayFirst ? (dow === 0 ? 6 : dow - 1) : dow;
  nd.setDate(nd.getDate() - offset); nd.setHours(0,0,0,0); return nd;
}
function endOfWeek(d: Date, mondayFirst = false) { const s = startOfWeek(d, mondayFirst); const nd = new Date(s); nd.setDate(nd.getDate() + 6); return nd; }
function formatMonthYear(d: Date) { return d.toLocaleString(undefined, { month: "long", year: "numeric" }); }

export default function CalendarPage() {
  const [cursor, setCursor] = React.useState<Date>(startOfMonth(new Date()));
  const [filters, setFilters] = React.useState<FilterState>({ category: "", city: "", allAges: false, from: "", to: "" });
  const [facetCats, setFacetCats] = React.useState<string[]>([]);
  const [facetCities, setFacetCities] = React.useState<string[]>([]);
  const [events, setEvents] = React.useState<EventRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<EventRow | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());

  const mondayFirst = false;
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, mondayFirst);
  const gridEnd = endOfWeek(monthEnd, mondayFirst);
  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) days.push(d);

  React.useEffect(() => {
    const today = new Date();
    const inGrid = today >= gridStart && today <= gridEnd;
    setSelectedDate(inGrid ? today : monthStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.getFullYear(), cursor.getMonth()]);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/events/facets", { cache: "no-store" });
        const j = await res.json();
        if (res.ok) { setFacetCats(j.categories || []); setFacetCities(j.cities || []); }
      } catch {}
    })();
  }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const fromDate = filters.from ? new Date(filters.from + "T00:00:00") : new Date(gridStart);
      const toDate   = filters.to   ? new Date(filters.to   + "T23:59:59") : new Date(gridEnd);
      toDate.setDate(toDate.getDate() + 1);

      const params = new URLSearchParams({ from: fromDate.toISOString(), to: toDate.toISOString() });
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
  React.useEffect(() => {
    const id = setTimeout(() => { load(); }, 150);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.getFullYear(), cursor.getMonth(), filters.category, filters.city, filters.allAges, filters.from, filters.to]);

  const byDay = React.useMemo(() => {
    const m = new Map<string, EventRow[]>();
    for (const ev of events) {
      const dkey = new Date(ev.starts_at).toISOString().slice(0, 10);
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

  const listForSelectedDate = React.useMemo(() => {
    const key = selectedDate.toISOString().slice(0, 10);
    return (byDay.get(key) || []).slice().sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );
  }, [byDay, selectedDate]);

  function gotoToday() { const today = new Date(); setCursor(startOfMonth(today)); setSelectedDate(today); }
  function prevMonth() { setCursor(prev => addMonths(prev, -1)); }
  function nextMonth() { setCursor(prev => addMonths(prev, 1)); }
  function handleDayClick(d: Date) { setSelectedDate(d); }

  return (
    <main className="p-6 max-w-7xl mx-auto">
      {/* header & nav */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <div className="flex gap-2">
          <button className="btn" onClick={prevMonth}>← Prev</button>
          <button className="btn" onClick={gotoToday}>Today</button>
          <button className="btn" onClick={nextMonth}>Next →</button>
          <button className="btn" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
        </div>
      </div>

      {/* filters */}
      <FilterBar
        value={filters}
        onChange={setFilters}
        onClear={() => setFilters({ category: "", city: "", allAges: false, from: "", to: "" })}
        categories={facetCats}
        cities={facetCities}
      />

      {error && <p className="text-red-700 mb-3">Error: {error}</p>}

      {/* weekday header */}
      <div className="grid grid-cols-7 text-xs font-semibold text-gray-600 mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (<div key={d} className="p-2">{d}</div>))}
      </div>

      {/* grid */}
      <div className="grid grid-cols-7 border rounded overflow-hidden bg-white">
        {(() => {
          const items: React.ReactNode[] = [];
          const monthDays: Date[] = [];
          for (let d = new Date(gridStart); d <= gridEnd; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) monthDays.push(d);

          monthDays.forEach((d, i) => {
            const isOtherMonth = d.getMonth() !== cursor.getMonth();
            const isToday = sameDay(d, new Date());
            const isSelected = sameDay(d, selectedDate);
            const key = d.toISOString().slice(0, 10);
            const todays = byDay.get(key) || [];
            const maxShow = 3;
            const extra = Math.max(0, todays.length - maxShow);

            items.push(
              <button
                type="button"
                key={i}
                onClick={() => handleDayClick(d)}
                className={[
                  "min-h-[120px] border-r border-b p-2 text-left flex flex-col gap-1 focus:outline-none",
                  (i % 7 === 6) ? "border-r-0" : "",
                  (Math.floor(i / 7) === monthDays.length / 7 - 1) ? "border-b-0" : "",
                  isOtherMonth ? "bg-gray-50" : "bg-white",
                  isSelected ? "ring-2 ring-[var(--lis-ocean)] relative" : "",
                ].join(" ")}
              >
                <div className="text-xs flex items-center justify-between">
                  <span className={isOtherMonth ? "text-gray-400" : ""}>{d.getDate()}</span>
                  <div className="flex items-center gap-1">
                    {isToday && <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700">Today</span>}
                    {isSelected && <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--lis-tram)] text-black">Selected</span>}
                  </div>
                </div>
                <div className="mt-1 flex-1 space-y-1">
                  {todays.slice(0, maxShow).map(ev => (
                    <div key={ev.id} className="w-full text-left text-xs truncate px-2 py-1 rounded border hover:bg-gray-50">
                      {(ev.all_day ? "• " : new Date(ev.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + " · ")}
                      <span className="font-medium">{ev.title}</span>
                      {ev.location_name ? ` @ ${ev.location_name}` : ""}
                    </div>
                  ))}
                  {extra > 0 && <span className="text-[11px] text-gray-600">+ {extra} more</span>}
                </div>
              </button>
            );
          });
          return items;
        })()}
      </div>

      {/* below list */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Events on {selectedDate.toLocaleDateString()}</h2>
          <div className="h-2 w-36 rounded" style={{ background: "linear-gradient(90deg,var(--lis-ocean),var(--lis-tram))" }} />
        </div>

        {loading && <p>Loading…</p>}
        {!loading && (listForSelectedDate.length === 0) && (
          <p>No events for this date with the current filters.</p>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listForSelectedDate.map(ev => (<EventCard key={ev.id} ev={ev} />))}
        </div>
      </section>
    </main>
  );
}

