// app/events/page.tsx
export const dynamic = "force-dynamic";

import fs from "node:fs/promises";
import path from "node:path";
import EventCard, { type EventRecord } from "@/components/EventCard";

function truthy(v: string | null | undefined) {
  return ["true", "1", "yes", "y"].includes(String(v ?? "").trim().toLowerCase());
}
function toISODateTime(s: string | null | undefined) {
  if (!s) return "";
  const t = String(s).trim();
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return `${t}T00:00:00.000Z`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t) && !/[zZ]|[+\-]\d{2}:\d{2}$/.test(t)) return t + "Z";
  return t;
}
function addDaysISO(ymd: string, days: number) {
  const d = new Date(ymd + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}
function parseCSV(text: string): Record<string, string>[] {
  if (text && text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (inQuotes && text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = !inQuotes; } }
    else if (c === "," && !inQuotes) { pushField(); }
    else if ((c === "\n" || c === "\r") && !inQuotes) { pushField(); if (c === "\r" && text[i + 1] === "\n") i++; pushRow(); }
    else { field += c; }
  }
  pushField(); if (row.length > 1 || rows.length === 0) pushRow();
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
function rowToEvent(r: Record<string, string>): EventRecord | null {
  const title = (r["title"] ?? "").trim();
  if (!title) return null;
  const startRaw = (r["start"] ?? "").trim();
  const endRaw = (r["end"] ?? "").trim();
  const allDay = truthy(r["all_day"]);
  const starts_at = toISODateTime(startRaw);
  let ends_at = endRaw ? toISODateTime(endRaw) : "";
  if (allDay) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(endRaw)) ends_at = addDaysISO(endRaw, 1);
    else if (!ends_at) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(startRaw)) ends_at = addDaysISO(startRaw, 1);
      else if (starts_at) { const d = new Date(starts_at); d.setUTCDate(d.getUTCDate() + 1); ends_at = d.toISOString(); }
    }
  }
  if (!ends_at && starts_at) ends_at = starts_at;
  return {
    id: `${starts_at}|${title}`,
    title,
    description: r["description"] ?? "",
    starts_at,
    ends_at,
    category: r["category"] ?? "",
    location_name: r["venue"] ?? "",
    city: r["city"] ?? "",
    address: r["address"] ?? "",
    ticket_url: r["source_url"] ?? "",
    image_url: ""
  } as EventRecord;
}

async function loadAllEventsFromCSV(): Promise<EventRecord[]> {
  const csvPath = path.join(process.cwd(), "public", "events.csv");
  let csv = "";
  try { csv = await fs.readFile(csvPath, "utf8"); } catch { return []; }
  const rows = parseCSV(csv);
  return rows.map(rowToEvent).filter((e): e is EventRecord => !!e);
}

export default async function EventsPage() {
  const all = await loadAllEventsFromCSV();

  // Upcoming = ends_at >= now
  const now = Date.now();
  const upcoming = all
    .filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() >= now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Events <span className="text-xs align-middle opacity-60">(src: csv)</span>
      </h1>

      {upcoming.length === 0 && (
        <div className="card">No upcoming events. Check back soon or <a href="/submit" className="underline">submit one</a>.</div>
      )}

      <div className="grid gap-4">
        {upcoming.map((e) => (
          <EventCard key={e.id} evt={e} />
        ))}
      </div>
    </div>
  );
}