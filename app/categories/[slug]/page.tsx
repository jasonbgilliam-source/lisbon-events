"use client";

import * as React from "react";
import { buildCatalogIndex } from "@/lib/categoryMeta";
import EventCard, { type EventRow } from "//components/EventCard";
import ConsentGate from "/app/components/ConsentGate";

function toISODateOnly(d: Date) { return d.toISOString().slice(0, 10); }

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  const [categoryName, setCategoryName] = React.useState<string>("");
  const [hero, setHero] = React.useState<string>("/images/lisbon-skyline.jpg");
  const [embeds, setEmbeds] = React.useState<{ type: "youtube"|"html"; url?: string; html?: string; title?: string }[]>([]);
  const [events, setEvents] = React.useState<EventRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const cRes = await fetch("/api/categories/list", { cache: "no-store" });
        const cJson = await cRes.json();
        const cats: string[] = cJson.categories || [];
        const { bySlug } = buildCatalogIndex(cats);
        const meta = bySlug.get(slug);
        if (!meta) {
          setCategoryName("(Unknown Category)");
          setHero("/images/lisbon-skyline.jpg");
          setEmbeds([]);
          return;
        }
        setCategoryName(meta.name);
        setHero(meta.heroImage);
        setEmbeds(meta.embeds || []);
      } catch {
        setCategoryName("(Unknown Category)");
      }
    })();
  }, [slug]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const today = new Date();
      const from = toISODateOnly(today);
      const until = new Date(today); until.setDate(until.getDate() + 180);
      const to = toISODateOnly(until);

      const params = new URLSearchParams({
        from: new Date(from + "T00:00:00").toISOString(),
        to: new Date(to + "T23:59:59").toISOString(),
        category: categoryName || "",
      });

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
  React.useEffect(() => { if (categoryName) load(); /* eslint-disable-next-line */ }, [categoryName]);

  return (
    <main className="max-w-7xl mx-auto p-0">
      <div className="relative h-48 md:h-64 lg:h-72">
        <img src={hero} alt={categoryName} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 text-white">
          <h1 className="text-2xl md:text-3xl font-semibold">{categoryName || "Category"}</h1>
          <p className="text-white/90 text-sm">Upcoming in {categoryName || "this category"} — explore & listen.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {embeds.length > 0 && (
          <section className="mb-8">
            <div className="tile-rule text-lg font-semibold mb-3">Fresh from the scene</div>
            <div className="grid md:grid-cols-2 gap-4">
              {embeds.map((em, i) => (
                <ConsentGate key={i}>
                  <div className="card p-3">
                    {em.title && <div className="text-sm font-medium mb-2">{em.title}</div>}
                    {em.type === "youtube" && em.url && (
                      <div className="aspect-video">
                        <iframe
                          className="w-full h-full rounded-xl"
                          src={em.url}
                          title={em.title || "YouTube"}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                    {em.type === "html" && em.html && (
                      <div className="overflow-hidden" dangerouslySetInnerHTML={{ __html: em.html }} />
                    )}
                  </div>
                </ConsentGate>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="tile-rule text-lg font-semibold mb-3">Listings</div>
          {error && <p className="text-red-700 mb-3">Error: {error}</p>}
          {loading && <p>Loading…</p>}
          {!loading && events.length === 0 && <p>No upcoming events in this category.</p>}
          <ul className="space-y-4">
            {events.map((ev) => {
              const d = new Date(ev.starts_at);
              const day = d.toLocaleDateString(undefined, { day: "2-digit" });
              const mon = d.toLocaleDateString(undefined, { month: "short" });
              const yr  = d.getFullYear();
              return (
                <li key={`${ev.id}`} className="card p-3 md:p-4">
                  <div className="flex gap-4">
                    <div className="w-20 shrink-0 text-center">
                      <div className="text-xl font-semibold">{day}</div>
                      <div className="text-xs uppercase tracking-wide text-gray-600">{mon}</div>
                      <div className="text-xs text-gray-500">{yr}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-base md:text-lg truncate">{ev.title}</h3>
                        <div className="text-xs text-gray-600">
                          {ev.all_day ? "All day" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700">
                        {ev.location_name ? `${ev.location_name}` : ""}{ev.city ? `, ${ev.city}` : ""}
                      </div>
                      {ev.description && <p className="text-sm mt-2">{ev.description}</p>}
                      <div className="mt-2 flex flex-wrap gap-3 text-sm">
                        {ev.ticket_url && <a className="underline" href={ev.ticket_url} target="_blank" rel="noreferrer">Tickets</a>}
                        {ev.youtube_url && <a className="underline" href={ev.youtube_url} target="_blank" rel="noreferrer">YouTube</a>}
                        {ev.spotify_url && <a className="underline" href={ev.spotify_url} target="_blank" rel="noreferrer">Spotify</a>}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
