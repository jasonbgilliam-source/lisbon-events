"use client";

import * as React from "react";
import FilterBar, { type FilterState } from "../components/FilterBar";
import EventCard, { type EventRow } from "../components/EventCard";

function toISODateOnly(d: Date) { return d.toISOString().slice(0, 10); }

export default function EventsPage() {
  const [filters, setFilters] = React.useState<FilterState>({ category: "", city: "", allAges: false, from: "", to: "" });
  const [facetCats, setFacetCats] = React.useState<string[]>([]);
  const [facetCities, setFacetCities] = React.useState<string[]>([]);
  const [events, setEvents] = React.useState<EventRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
      // default range: today → +60 days unless provided
      const today = new Date();
      const defaultFrom = toISODateOnly(today);
      const plus60 = new Date(today); plus60.setDate(plus60.getDate() + 60);
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
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);
      const items = (j.items || []) as EventRow[];
      items.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
      setEvents(items);
    } catch (e: any) {
      setError(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => {
    const id = setTimeout(() => load(), 150);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.city, filters.allAges, filters.from, filters.to]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const ev of events) {
      const key = (ev.category || "").trim() || "__UNCAT__";
      const arr = map.get(key) || [];
      arr.push(ev); map.set(key, arr);
    }
    const keys = Array.from(map.keys()).filter(k => k !== "__UNCAT__").sort((a,b)=>a.localeCompare(b));
    if (map.has("__UNCAT__")) keys.push("__UNCAT__");
    return keys.map(k => ({ category: k === "__UNCAT__" ? "Uncategorized" : k, items: map.get(k) || [] }));
  }, [events]);

  function clearFilters() { setFilters({ category: "", city: "", allAges: false, from: "", to: "" }); }

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">Events</h1>
        <button className="btn" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
      </div>

      <FilterBar value={filters} onChange={setFilters} onClear={clearFilters} categories={facetCats} cities={facetCities} />

      {error && <p className="text-red-700 mb-3">Error: {error}</p>}

      <div className="space-y-8">
        {grouped.map(section => (
          <section key={section.category}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">{section.category} <span className="text-sm text-gray-500">({section.items.length})</span></h2>
              <div className="h-2 w-24 rounded" style={{ background: "linear-gradient(90deg,var(--lis-tile),var(--lis-tram))" }} />
            </div>
            {section.items.length === 0 ? (
              <p className="text-sm text-gray-600">No events in this category for the selected filters.</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.items.map(ev => (<EventCard key={ev.id} ev={ev} />))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
