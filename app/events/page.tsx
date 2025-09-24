"use client";

import * as React from "react";
import FilterBar, { type FilterState } from "../components/FilterBar";

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

/* ------------------------------ helpers --------------------------------- */
function toISODateOnly(d: Date) { return d.toISOString().slice(0, 10); }
function fmtDateTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString([], { year: "numeric", month: "short", day: "2-digit", hour: "numeric", minute: "2-digit" });
}
function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/* ------------------------------- page ----------------------------------- */
export default function EventsPage() {
  // filters (same shape as calendar FilterBar)
  const [filters, setFilters] = React.useState<FilterState>({
    category: "",
    city: "",
    allAges: false,
    from: "",
    to: "",
  });

  // facets (same source as calendar)
  const [facetCats, setFacetCats] = React.useState<string[]>([]);
  const [facetCities, setFacetCities] = React.useState<string[]>([]);

  // data state
  const [events, setEvents] = React.useState<EventRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // load facets once
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

  // fetch events with same filters behavior as calendar
  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Default range: today → +60 days unless user set from/to
      const today = new Date();
      const defaultFrom = toISODateOnly(today);
      const plus60 = new Date(today);
      plus60.setDate(plus60.getDate() + 60);
      const defaultTo = toISODateOnly(plus60);

      const fromDate = filters.from || defaultFrom;
      const toDate   = filters.to   || defaultTo;

      const params = new URLSearchParams({
        from: new Date(fromDate + "T00:00:00").toISOString(),
        to: new Date(toDate + "T23:59:59").toISOString(),
      });
      if (filters.category.trim()) params.set("category", filters.category.trim());
      if (filters.city.trim()) params.set("city", filters.city.trim());
      if (filters.allAges) params.set("all_ages", "true");

      const res = await fetch(`/api/events/combined?${params.toString()}`, { cache: "no-store" });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const t = await res.text();
        throw new Error(`Expected JSON from /api/events/combined, got ${res.status}. First bytes: ${t.slice(0,120)}`);
      }
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);

      const items = (j.items || []) as EventRow[];

      // sort globally by starts_at, then group by category
      items.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
      setEvents(items);
    } catch (e: any) {
      setError(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  // initial & whenever filters change (debounced to feel snappy)
  React.useEffect(() => {
    const id = setTimeout(() => load(), 150);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.city, filters.allAges, filters.from, filters.to]);

  // group by category (A→Z), with "Uncategorized" last
  const grouped = React.useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const ev of events) {
      const cat = (ev.category || "").trim();
      const key = cat || "__UNCAT__";
      const arr = map.get(key) || [];
      arr.push(ev);
      map.set(key, arr);
    }

    const keys = Array.from(map.keys()).filter(k => k !== "__UNCAT__").sort((a, b) => a.localeCompare(b));
    if (map.has("__UNCAT__")) keys.push("__UNCAT__");

    return keys.map(k => ({
      category: k === "__UNCAT__" ? "Uncategorized" : k,
      items: (map.get(k) || []).slice().sort((a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      ),
    }));
  }, [events]);

  function clearFilters() {
    setFilters({ category: "", city: "", allAges: false, from: "", to: "" });
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">Events</h1>
        <button className="border px-3 py-1 rounded" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Same FilterBar as calendar, sourced from the same facets */}
      <FilterBar
        value={filters}
        onChange={setFilters}
        onClear={clearFilters}
        categories={facetCats}
        cities={facetCities}
      />

      {error && <p className="text-red-700 mb-3">Error: {error}</p>}
      {!error && loading && <p className="mb-3">Loading…</p>}

      {!loading && grouped.length === 0 && (
        <p>No events match the current filters.</p>
      )}

      {/* Category sections */}
      <div className="space-y-8">
        {grouped.map(section => (
          <section key={section.category}>
            <h2 className="text-lg font-semibold mb-3">
              {section.category} <span className="text-sm text-gray-500">({section.items.length})</span>
            </h2>

            <ul className="space-y-3">
              {section.items.map(ev => (
                <li key={ev.id} className="border rounded p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{ev.title}</div>
                      <div className="text-sm text-gray-600">
                        {ev.all_day ? "All day" : fmtDateTime(ev.starts_at)}
                        {ev.ends_at ? ` – ${fmtTime(ev.ends_at)}` : ""}
                        {ev.location_name ? ` @ ${ev.location_name}` : ""}
                        {ev.city ? `, ${ev.city}` : ""}
                      </div>
                      {ev.age && <div className="text-xs mt-1">Age: {ev.age}</div>}
                      {ev.description ? <p className="mt-2 text-sm">{ev.description}</p> : null}
                      <div className="mt-2 flex gap-3 text-sm">
                        {ev.ticket_url && (
                          <a className="underline" href={ev.ticket_url} target="_blank" rel="noreferrer">Tickets</a>
                        )}
                        {ev.image_url && (
                          <a className="underline" href={ev.image_url} target="_blank" rel="noreferrer">Image</a>
                        )}
                        {ev.organizer_email && (
                          <a className="underline" href={`mailto:${ev.organizer_email}`} target="_blank" rel="noreferrer">
                            Email organizer
                          </a>
                        )}
                      </div>
                    </div>
                    {/* right column could hold a small badge or share button */}
                    <div className="text-right text-xs text-gray-500">
                      {ev.category || ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
