import MonthCalendar from "@/components/MonthCalendar";
import EventCard, { type EventRecord } from "@/components/EventCard";
import { supabaseServer } from "@/lib/supabaseServer";

type Search = { date?: string };

function startEndForDate(ymd: string) {
  // interpret as UTC day window [00:00, next 00:00)
  const start = new Date(ymd + "T00:00:00.000Z");
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

async function getEventsForDay(ymd: string): Promise<EventRecord[]> {
  const { startISO, endISO } = startEndForDate(ymd);
  const sb = supabaseServer();

  // Include:
  // 1) events that start that day
  // 2) events that end that day
  // 3) events spanning across the whole day (started before, end after)
  const or = [
    `and(starts_at.gte.${startISO},starts_at.lt.${endISO})`,
    `and(ends_at.gte.${startISO},ends_at.lt.${endISO})`,
    `and(starts_at.lt.${startISO},ends_at.gte.${endISO})`
  ].join(",");

  const { data, error } = await sb
    .from("events")
    .select(
      "id, title, description, starts_at, ends_at, category, location_name, city, address, ticket_url, image_url"
    )
    .or(or)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as EventRecord[];
}

export default async function CalendarPage({ searchParams }: { searchParams: Search }) {
  const selectedDate = searchParams.date ?? new Date().toISOString().slice(0, 10);
  const events = await getEventsForDay(selectedDate);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calendar</h1>

      <MonthCalendar selectedDate={selectedDate} />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          Events on {new Date(selectedDate + "T00:00:00Z").toLocaleDateString("en-GB")}
        </h2>
        {events.length === 0 && (
          <div className="card">No events on this day (yet!). Try another date or <a href="/submit" className="underline">submit one</a>.</div>
        )}
        <div className="grid gap-4">
          {events.map((e) => (
            <EventCard key={e.id} evt={e} />
          ))}
        </div>
      </section>
    </div>
  );
}
