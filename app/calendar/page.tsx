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

  // selected date for below-list (default to today if visible, else first of month)
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());

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

  // ensure selectedDate stays sensible when month changes
  React.useEffect(() => {
    const today = new Date();
    const inGrid = today >= gridStart && today <= gridEnd;
    setSelectedDate(inGrid ? today : monthStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.getFullYear(), cursor.getMonth()]);

  // load facets (one-time on mount)
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/events/facets", { cache: "no-store" });
        const j = await res.json();
        if (res.ok) {
          setFacetCats(j.categories || []);
          setFacetCities(j.cities || []);
        }
      } catch {}
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

  // group events by day for fast lookup
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

  // list data for the selected date (already filtered at fetch-time)
  const listForSelectedDate = React.useMemo(() => {
    const key = toISODateOnly(selectedDate);
    return (byDay.get(key) || []).slice().sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );
  }, [byDay, selectedDate]);

  function gotoToday() {
    const today = new Date();
    setCursor(startOfMonth(today));
    setSelectedDate(today);
  }
  function prevMonth() { setCursor(prev => addMonths(prev, -1)); }
  function nextMonth() { setCursor(prev => addMonths(prev, 1)); }

  function handleDayClick(d: Date) {
    setSelectedDate(d);
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
        onClear={() => setFilters({ category: "", city: "", allAges: false, from: "", to: "" })}
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
          const isSelected = sameDay(d, selectedDate);
          const key = toISODateOnly(d);
          const todays = byDay.get(key) || [];
          const maxShow = 3;
          const extra = Math.max(0, todays.length - maxShow);
          return (
            <button
              type="button"
              key={i}
              onClick={() => handleDayClick(d)}
              className={[
                "min-h-[120px] border-r border-b p-2 text-left flex flex-col gap-1 focus:outline-none",
                (i % 7 === 6) ? "border-r-0" : "",
                (Math.floor(i / 7) === days.length / 7 - 1) ? "border-b-0" : "",
                isOtherMonth ? "bg-gray-50" : "bg-white",
                isSelected ? "ring-2 ring-blue-400 relative" : "",
              ].join(" ")}
            >
              <div className="text-xs flex items-center justify-between">
                <span className={isOtherMonth ? "text-gray-400" : ""}>{d.getDate()}</span>
                <div className="flex items-center gap-1">
                  {isToday && <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700">Today</span>}
                  {isSelected && <span className="text-[10px] px-1 py-0.5 rounded bg-blue-600 text-white">Selected</span>}
                </div>
              </div>

              <div className="mt-1 flex-1 space-y-1">
                {todays.slice(0, maxShow).map(ev => (
                  <div
                    key={ev.id}
                    className="w-full text-left text-xs truncate px-2 py-1 rounded border hover:bg-gray-50"
                    title={ev.title}
                    onClick={(e) => { e.stopPropagation(); setSelected(ev); }}
                  >
                    {ev.all_day ? "• " : `${formatTime(ev.starts_at)} · `}
                    <span className="font-medium">{ev.title}</span>
                    {ev.location_name ? ` @ ${ev.location_name}` : ""}
                  </div>
                ))}
                {extra > 0 && (
                  <span className="text-[11px] text-gray-600">+ {extra} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* BELOW-CALENDAR LIST FOR SELECTED DATE */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-2">
          Events on {selectedDate.toLocaleDateString()}
        </h2>

        {loading && <p>Loading…</p>}

        {!loading && listForSelectedDate.length === 0 && (
          <p>No events for this date with the current filters.</p>
        )}

        <ul className="space-y-3">
          {listForSelectedDate.map((ev) => (
            <li key={ev.id} className="border rounded p-3">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{ev.title}</div>
                  <div className="text-sm text-gray-600">
                    {ev.all_day ? "All day" : formatTime(ev.starts_at)}
                    {ev.ends_at ? ` – ${formatTime(ev.ends_at)}` : ""}
                    {ev.location_name ? ` @ ${ev.location_name}` : ""}
                    {ev.city ? `, ${ev.city}` : ""}
                  </div>
                  {ev.category && <div className="text-xs mt-1">Category: {ev.category}</div>}
                  {ev.age && <div className="text-xs">Age: {ev.age}</div>}
                  {ev.description ? <p className="mt-2 text-sm">{ev.description}</p> : null}
                  <div className="mt-2 flex gap-3 text-sm">
                    {ev.ticket_url && (
                      <a className="underline" href={ev.ticket_url} target="_blank" rel="noreferrer">Tickets</a>
                    )}
                    {ev.image_url && (
                      <a className="underline" href={ev.image_url} target="_blank" rel="noreferrer">Image</a>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  {/* keep details panel optional; click title in grid already opens it */}
                  <button className="border px-2 py-1 rounded" onClick={() => setSelected(ev)}>
                    Details
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* details drawer (optional quick view) */}
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
