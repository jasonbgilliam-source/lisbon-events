"use client";

import * as React from "react";

export type EventRow = {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  category?: string | null;
  location_name?: string | null;
  city?: string | null;
  ticket_url?: string | null;
  image_url?: string | null;
  all_day?: boolean | null;
  age?: string | null;
  organizer_email?: string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
};

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

export default function EventCard({ ev }: { ev: EventRow }) {
  const cover = ev.image_url || "/images/tram-28.jpg";
  return (
    <article className="card p-3 md:p-4">
      <div className="flex gap-3 md:gap-4">
        <div className="w-28 h-28 md:w-36 md:h-36 shrink-0 overflow-hidden">
          <img src={cover} alt={ev.title} className="w-full h-full img-soft" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-base md:text-lg truncate">{ev.title}</h3>
            {ev.category && (
              <span className="text-[11px] md:text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: "#d7dee9", background: "#fffbec" }}>
                {ev.category}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-700 mt-0.5">
            {ev.all_day ? "All day" : fmtDateTime(ev.starts_at)}
            {ev.ends_at ? ` – ${fmtTime(ev.ends_at)}` : ""}
            {ev.location_name ? ` @ ${ev.location_name}` : ""}
            {ev.city ? `, ${ev.city}` : ""}
          </div>
          {ev.description && <p className="text-sm mt-2 line-clamp-3">{ev.description}</p>}
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {ev.ticket_url && <a className="underline" href={ev.ticket_url} target="_blank" rel="noreferrer">Tickets</a>}
            {ev.youtube_url && <a className="underline" href={ev.youtube_url} target="_blank" rel="noreferrer">YouTube</a>}
            {ev.spotify_url && <a className="underline" href={ev.spotify_url} target="_blank" rel="noreferrer">Spotify</a>}
            {ev.organizer_email && <a className="underline" href={`mailto:${ev.organizer_email}`}>Email organizer</a>}
          </div>
        </div>
      </div>
    </article>
  );
}
