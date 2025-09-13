import fs from "node:fs/promises";
import path from "node:path";
import MonthCalendar from "@/components/MonthCalendar";
import EventCard, { type EventRecord } from "@/components/EventCard";

type Search = { date?: string };

// ---- utilities ----
function startEndForDate(ymd: string) {
  // Interpret as UTC window [00:00Z, next 00:00Z)
  const start = new Date(ymd + "T00:00:00.000Z");
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

function truthy(v: string | undefined) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
}

function toISODateTime(s: string | undefined) {
  if (!s) return "";
  const t = s.trim();
  if (!t) return "";
  // If it's a date-only, make it 00:00Z; if it has time but no zone, add Z.
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return `${t}T00:00:00.000Z`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t) && !/[zZ]|[+\-]\d{2}:\d{2}$/.test(t)) {
    return t + "Z";
  }
  return t;
}

function addDaysISO(dateYYYYMMDD: string, days: number) {
  const d = new Date(dateYYYYMMDD + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function overlapsDay(startsAtISO: string, endsAtISO: string, dayStartISO: string, dayEndISO: string) {
  // 1) starts that day  2) ends that day  3) spans across the whole day
  const s = new Date(startsAtISO).getTime();
  const e = new Date(endsAtISO).getTime();
  const ds = new Date(dayStartISO).getTime();
  const de = new Date(dayEndISO).getTime();
  return (
    (s >= ds && s < de) ||
    (e > ds && e <= de) ||
    (s < ds && e >= de)
  );
}

// Tiny CSV parser that handles quotes & commas
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === "," && !inQuotes) {
      pushField();
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      pushField();
      // swallow \r\n pairs
      if (c === "\r" && text[i + 1] === "\n") i++;
      pushRow();
    } else {
      field += c;
    }
  }
  // last field/row
  pushField();
  if (row.length > 1 || rows.length === 0) pushRow();

  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const obj: Record<string, string> = {};
    for (let c = 0; c < header.length; c++) obj[header[c]] = rows[r][c] ?? "";
    out.push(obj);
  }
  return out;
}

// Map CSV row -> EventRecord expected by <EventCard />
function csvRowToEvent(r: Record<string, string>): EventRecord | null {
  const title = (r["title"] ?? "").trim();
  if (!title) return null;

  const startRaw = (r["start"] ?? "").trim();
  const endRaw = (r["end"] ?? "").trim();
  const allDay = truthy(r["all_day"]);

  const starts_at = toISODateTime(startRaw);
  let ends_at = endRaw ? toISODateTime(endRaw) : "";

  // For all-day with date-only end, make end exclusive by adding 1 day
  if (allDay) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(endRaw)) {
      ends_at = addDaysISO(endRaw, 1);
    } else if (!ends_at) {
      // single-day all-day: end = start + 1 day
      if (/^\d{4}-\d{2}-\d{2}$/.test(startRaw)) {
        ends_at = addDaysISO(startRaw, 1);
      } else if (starts_at) {
        const d = new Date(starts_at); d.setUTCDate(d.getUTCDate() + 1);
        ends_at = d.toISOString();
      }
    }
  }
  // If still missing an end, default to start (non-all-day short events)
  if (!ends_at && starts_at) ends_at = starts_at;

  const id = `${starts_at}|${title}`; // stable string id

  return {
    id,
    title,
    description: r["description"] ?? "",
    starts_at,
    ends_at,
    category: r["category"] ?? "",
    location_name: r["venue"] ?? "",
    city: r["city"] ?? "",
    address: r["address"] ?? "",
    ticket_url: r["source_url"] ?? "",
    image_url: "" // not provided by CSV
  } as EventRecord;
}

// ---- data loader (filesystem, no network) ----
async function getEventsForDayFromCSV(ymd: string): Promise<EventRecord[]> {
  const { startISO, endISO } = startEndForDate(ymd);
  const csvPath = path.join(process.cwd(), "public", "events.csv");
  const csvText = await fs.readFile(csvPath, "utf8");
  const rows = parseCSV(csvText);

  const events = rows
    .map(csvRowToEvent)
    .filter((e): e is EventRecord => !!e)
    .filter((e) => overlapsDay(e.starts_at, e.ends_at, startISO, endISO))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return events;
}

// ---- page ----
export default async function CalendarPage({ searchParams }: { searchParams: Search }) {
  const selectedDate = searchParams.date ?? new Date().toISOString().slice(0, 10);
  const events = await getEventsForDayFromCSV(selectedDate);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calendar</h1>

      <MonthCalendar selectedDate={selectedDate} />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          Events on {new Date(selectedDate + "T00:00:00Z").toLocaleDateString("en-GB")}
        </h2>
        {events.length === 0 && (
          <div className="card">
            No events on this day (yet!). Try another date or{" "}
            <a href="/submit" className="underline">submit one</a>.
          </div>
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
