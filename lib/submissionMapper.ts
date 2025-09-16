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
import { toIso, toBool } from "./utils"; // whatever helpers you use

/**
 * EDIT the left-hand keys (sub.whatever) so thour event_submissions columns.
 * If you're unsure: Supabase → Table Editor → event_submissions → note exact column names.
 */
export function mapSubmissionToEvent(sub: any) {
  const title     = sub.title ?? sub.name ?? sub.event_title;
  const starts_at = toIso(sub.start ?? sub.start_time ?? sub.start_datetime);
  const end       = toIso(sub.end ?? sub.end_time ?? sub.end_datetime) || starts_at;
  const all_day   = toBool(sub.all_day ?? sub.is_all_day ?? false);

  return {
    title,
    start: starts_at,
    end,
    all_day,
    venue: sub.venue ?? sub.location ?? "",
    city: sub.city ?? "",
    address: sub.address ?? "",
    price: sub.price ?? "",
    category: sub.category ?? "",
    description: sub.description ?? "",
    organizer: sub.organizer ?? "",
    source_url: sub.source_url ?? "",
    tags: sub.tags ?? "",
    recurrence_note: sub.recurrence_note ?? "",
  };
}
