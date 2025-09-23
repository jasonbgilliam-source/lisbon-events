"use client";

import * as React from "react";
import FilterBar, { FilterState } from "../components/FilterBar";

// tiny util
function toISODateOnly(d: Date) { return d.toISOString().slice(0, 10); }

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
  // filters
  const [filters, setFilters] = React.useState<FilterState>({
    category: "",
    city: "",
    allAges: false,
    from: "",
    to: "",
  });

  // data
  const [events, setEvents] = React.useState<EventRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Default range: today → +60 days, unless the user sets from/to.
      const today = new Date();
      const defaultFrom = toISODateOnly(today);
      const plus60 = new Date(today);
      plus60.setDate(plus60.getDate() + 60);
      const defaultTo = toISODateOnly(plus60);

      const fromDate = filters.from || defaultFrom;
      const toDate = filters.to || defaultTo;

      const params = new URLSearchParams({
        from: new Date(fromDate + "T00:00:00").toISOString(),
        to: new Date(toDate + "T23:59:59").toISOString(),
      });
      if (filters.category.trim()) params.set("category", filters.category.trim());
      if (filters.city.trim()) params.set("city", filters.city.trim());
      if (filters.allAges) params.set("all_ages", "true");

      const res = await fetch(`/api/events/list?${params.toString()}`, { cache: "no-store" });
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

  function clearFilters() {
    setFilters({ category: "", city: "", allAges: false, from: "", to: "" });
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  // reload when filters change (debounced)
  React.useEffect(() => {
    const id = setTimeout(() => load(), 150);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.city, filters.allAges, filters.from, filters.to]);

  // derive simple facets (from currently loaded events)
  const facet = React.useMemo(() => {
    const cats = new Set<string>();
    const cities = new Set<string>();
    for (const e of events) {
      if (e.category) cats.add(e.category);
      if (e.city) cities.add(e.city);
    }
    return {
      categories: Array.from(cats).sort((a, b) => a.localeCompare(b)),
      cities: Array.from(cities).sort((a, b) => a.localeCompare(b)),
    };
  }, [events]);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">Events</h1>
        <button className="border px-3 py-1 rounded" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Filter Bar */}
      <FilterBar
        value={filters}
        onChange={setFilters}
        onClear={clearFilters}
        categories={facet.categories}
        cities={facet.cities}
      />

      {error && <p className="text-red-700 mb-3">Error: {error}</p>}
      {!error && loading && <p className="mb-3">Loading…</p>}
      {!loading && events.length === 0 && <p>No events found for this filter.</p>}

      {/* Simple list (you can swap this for your grid UI later) */}
      <ul className="space-y-4">
        {events.map((ev) => (
          <li key={ev.id} className="border rounded p-4">
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{ev.title}</div>
                <div className="text-sm text-gray-600">
                  {new Date(ev.starts_at).toLocaleString()}
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
                {ev.ends_at ? `Ends: ${new Date(ev.ends_at).toLocaleString()}` : null}
                {ev.all_day ? <div>All day</div> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
