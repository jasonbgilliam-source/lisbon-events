// lib/submissionMapper.ts
function toIso(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
function toBool(v: any) {
  if (typeof v === "boolean") return v;
  if (v == null) return false;
  return String(v).trim().toLowerCase() === "true";
}

export type EventRow = {
  title: string;
  starts_at: string;      // ISO
  ends_at: string | null; // ISO
  all_day: boolean;
  location_name?: string | null;
  city?: string | null;
  address?: string | null;
  age?: string | null;
  category?: string | null;
  description?: string | null;
  organizer_email?: string | null;
  ticket_url?: string | null;
  image_url?: string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
};

export function mapSubmissionToEvent(sub: any): EventRow {
  const title = sub.title ?? sub.name ?? sub.event_title ?? "(untitled)";
  const starts_at =
    toIso(sub.starts_at ?? sub.start ?? sub.start_time ?? sub.start_datetime) ??
    new Date().toISOString();
  const ends_at = toIso(sub.ends_at ?? sub.end ?? sub.end_time ?? sub.end_datetime) ?? null;
  const all_day = toBool(sub.all_day ?? sub.is_all_day ?? false);

  return {
    title,
    starts_at,
    ends_at,
    all_day,
    location_name: sub.location_name ?? sub.venue ?? sub.location ?? null,
    city: sub.city ?? null,
    address: sub.address ?? null,
    age: sub.age ?? null,
    category: sub.category ?? sub.type ?? null,
    description: sub.description ?? sub.details ?? null,
    organizer_email: sub.organizer_email ?? sub.organizer ?? null,
    ticket_url: sub.ticket_url ?? sub.source_url ?? sub.url ?? null,
    image_url: sub.image_url ?? null,
    youtube_url: sub.youtube_url ?? null,
    spotify_url: sub.spotify_url ?? null,
  };
}
