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

// The exact shape we insert into `events`
export type EventRow = {
  title: string;
  description: string | null;
  starts_at: string;          // ISO
  ends_at: string | null;     // ISO
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

export function mapSubmissionToEvent(sub: any): EventRow {
  // NOTE: event_submissions already uses nearly the same names.
  const title = sub.title ?? sub.name ?? sub.event_title;

  const starts_at =
    toIso(sub.starts_at ?? sub.start ?? sub.start_time ?? sub.start_datetime) ??
    new Date().toISOString();

  const ends_at =
    toIso(sub.ends_at ?? sub.end ?? sub.end_time ?? sub.end_datetime) ?? null;

  return {
    title,
    description: sub.description ?? null,
    starts_at,
    ends_at,
    category: sub.category ?? null,
    location_name: sub.location_name ?? sub.venue ?? null,
    city: sub.city ?? null,                   // your submissions default to 'Lisboa'; fine.
    address: sub.address ?? null,
    ticket_url: sub.ticket_url ?? null,
    image_url: sub.image_url ?? null,
    all_day: toBool(sub.all_day ?? false),
    age: sub.age ?? null,
    organizer_email: sub.organizer_email ?? null,
  };
}
