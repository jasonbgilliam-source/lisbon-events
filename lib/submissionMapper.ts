// lib/submissionMapper.ts

// --- tiny helpers kept in this file so there are no missing imports ---
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

// Shape we insert into the `events` table and write to CSV
export type EventRow = {
  title: string;
  start: string;             // ISO string
  end: string;               // ISO string
  all_day: boolean;
  venue?: string;
  city?: string;
  address?: string;
  price?: string;
  age?: string;
  category?: string;
  description?: string;
  organizer?: string;
  source_url?: string;
  tags?: string;
  recurrence_note?: string;
};

/**
 * Map ONE row from event_submissions -> canonical EventRow.
 * EDIT the left-hand `sub.<field>` names to match your actual event_submissions columns.
 */
export function mapSubmissionToEvent(sub: any): EventRow {
  const title = sub.title ?? sub.name ?? sub.event_title;

  // IMPORTANT: keep the variable named `start` (not starts_at) so we can reuse it below
  const start =
    toIso(sub.start ?? sub.start_time ?? sub.start_datetime) ?? new Date().toISOString();

  // If there is no end in the submission, fall back to start
  const end =
    toIso(sub.end ?? sub.end_time ?? sub.end_datetime) ?? start;

  const all_day = toBool(sub.all_day ?? sub.is_all_day ?? false);

  return {
    title,
    start,
    end,
    all_day,
    venue: sub.venue ?? sub.location_name ?? sub.location ?? "",
    city: sub.city ?? "",
    address: sub.address ?? "",
    price: sub.price ?? "",
    age: sub.age ?? "",
    category: sub.category ?? sub.type ?? "",
    description: sub.description ?? sub.details ?? "",
    organizer: sub.organizer ?? "",
    source_url: sub.source_url ?? sub.url ?? "",
    tags: sub.tags ?? "",
    recurrence_note: sub.recurrence_note ?? "",
  };
}
