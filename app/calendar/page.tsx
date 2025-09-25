"use client";

import * as React from "react";
import FilterBar, { type FilterState } from "../components/FilterBar";
import EventCard, { type EventRow } from "../components/EventCard";

/* --------------------------- tiny date helpers --------------------------- */
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toISODateOnly(d: Date) { return d.toISOString().slice(0, 10); }
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
type CombinedEvent = EventRow; // uses your shared EventRow (already normalized)

/* ------------------------------ main page -------------------------------- */
export default function CalendarPage() {
  // month cursor
  const [cursor, setCursor] = React.useState<Date>(startOfMonth(new Date()));

  // filters (same as events page)
  const [filters, setFilters] = React.useState<FilterState>({
    category: "",
    city: "",
    allAges: false,
    from: "",
    to: "",
  });

  // FACETS / CATALOG
  // categories strictly from catalog (single source of truth + order)
  const [catalogCategories, setCatalogCategories] = React.useState<string[]>([]);
  // cities from DB + CSV via facets
  const [facetCities, setFacetCities] = React.useState<string[]>([]);

  // data + ui state
  const [events, setEvents] = React.useState<CombinedEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<CombinedEvent | null>(null);

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

  // load catalog (categories) and facets (cities) once
  React.useEffect(() => {
    (async () => {
      try {
        // Categories from catalog: single source of truth + order
        const cRes = await fetch("/api/categories/list", { cache: "no-store" });
        const cJson = await cRes.json();
        if (cRes.ok) setCatalogCategories(cJson.categories || []);
      } catch {}
      try {
        // Cities still come from facets (DB + CSV)
        const fRes = await fetch("/api/events/facets", { cache: "no-store" });
        const fJson = await fRes.json();
        if (fRes.ok) setFacetCities(fJson.cities || []);
      } catch {}
    })();
  }, []);

  // fetch events for range + filters (events already normalized to catalog)
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
      if (filters.category.trim()) params.set("category", filters.category.trim()); // must be a catalog value
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
      setEvents((j.items || []) as CombinedEvent[]);
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
    const m = new Map<string, CombinedEvent[]>();
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

  // simple per-category counts for legend (respect catalog order)
  const categoryCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const ev of events) {
      const cat = ev.category ?? "__UNCAT__";
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    const ordered: { name: string; count: number }[] = [];
    for (const name of catalogCategories) {
      const c = counts.get(name);
      if (c) ordered.push({ name, count: c });
    }
    if (counts.get("__UNCAT__")) ordered.push({ name: "Uncategorized", count: counts.get("__UNCAT__") || 0 });
    return ordered;
  }, [events, catalogCategories]);

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
          <button className="btn" onClick={prevMonth}>← Prev</button>
          <button className="btn" onClick={gotoToday}>Today</button>
          <button className="btn" onClick={nextMonth}>Next →</button>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Filter Bar - categories from catalog, cities from facets */}
      <FilterBar
        value={filters}
        onChange={setFilters}
        onClear={() => setFilters({ category: "", city: "", allAges: false, from: "", to: "" })}
        categories={catalogCategories}   // <-- catalog source of truth
        cities={facetCities}
      />

      {error && <p className="text-red-700 mb-3">Error: {error}</p>}

      {/* optional legend in catalog order for currently loaded results */}
      {categoryCounts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {categoryCounts.map(({ name, count }) => (
            <span
              key={name}
              className="text-xs px-2 py-0.5 rounded-full border"
              title={`${count} event${count === 1 ? "" : "s"}`}
              style={{ borderColor: "#d7dee9", background: name === "Uncategorized" ? "#f7f7f7" : "#fffbec" }}
            >
              {name} · {count}
            </span>
          ))}
        </div>
      )}

      {/* weekday header */}
      <div className="grid grid-cols-7 text-xs font-semibold text-gray-600 mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="p-2">{d}</div>
        ))}
      </div>

      {/* month grid */}
      <div className="grid grid-cols-7 border rounded overflow-hidden bg-white">
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
                  <div
                    key={`${ev.id}`}
                    className="w-full text-left text-xs truncate px-2 py-1 rounded border hover:bg-gray-50"
                    title={`${ev.title}${ev.category ? ` • ${ev.category}` : ""}`}
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Events on {selectedDate.toLocaleDateString()}</h2>
          <div className="h-2 w-36 rounded" style={{ background: "linear-gradient(90deg,var(--lis-ocean),var(--lis-tram))" }} />
        </div>

        {loading && <p>Loading…</p>}

        {!loading && listForSelectedDate.length === 0 && (
          <p>No events for this date with the current filters.</p>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listForSelectedDate.map(ev => (<EventCard key={`${ev.id}`} ev={ev} />))}
        </div>
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
              <button className="btn" onClick={() => setSelected(null)}>Close</button>
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
