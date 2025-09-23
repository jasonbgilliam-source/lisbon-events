"use client";

import * as React from "react";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
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
  const [events, setEvents] = React.useState<EventRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events/list", { cache: "no-store" });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const t = await res.text();
        throw new Error(`Expected JSON from /api/events/list, got ${res.status}. First bytes: ${t.slice(0, 120)}`);
      }
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);
      setEvents(j.items || []);
    } catch (e: any) {
      setError(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <button className="border px-3 py-1 rounded" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="text-red-700 mb-3">Error: {error}</p>}
      {!error && loading && <p>Loading…</p>}
      {!loading && events.length === 0 && <p>No upcoming events yet.</p>}

      <ul className="space-y-4">
        {events.map(ev => (
          <li key={ev.id} className="border rounded p-4">
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{ev.title}</div>
                <div className="text-sm text-gray-600">
                  {new Date(ev.starts_at).toLocaleString()}{" "}
                  {ev.location_name ? `@ ${ev.location_name}` : ""}
                  {ev.city ? `, ${ev.city}` : ""}
                </div>
                {ev.category && <div className="text-xs mt-1">Category: {ev.category}</div>}
                {ev.age && <div className="text-xs">Age: {ev.age}</div>}
                {ev.description ? <p className="mt-2 text-sm">{ev.description}</p> : null}
                <div className="mt-2 flex gap-3 text-sm">
                  {ev.ticket_url && (
                    <a className="underline" href={ev.ticket_url} target="_blank" rel="noreferrer">
                      Tickets
                    </a>
                  )}
                  {ev.image_url && (
                    <a className="underline" href={ev.image_url} target="_blank" rel="noreferrer">
                      Image
                    </a>
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
