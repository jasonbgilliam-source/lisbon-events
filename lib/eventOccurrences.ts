import { supabaseServer } from '@/lib/supabaseServer';
import { groupEvents } from '@/lib/eventSeries.mjs';

export async function readAll(table: string, columns = '*') {
  const db = supabaseServer();
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from(table).select(columns).order(table === 'events' ? 'id' : 'event_slug').order('starts_at').range(offset, offset + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}
export async function loadSeries() {
  const [events, occurrences] = await Promise.all([readAll('events'), readAll('event_occurrences')]);
  return groupEvents(events, occurrences);
}

export async function loadUpcomingSeries() {
  const now = new Date().toISOString();
  return (await loadSeries()).map((e: any) => {
    const upcoming = e.occurrences.filter((o: any) => (o.ends_at || o.starts_at) >= now);
    return { ...e, occurrences: upcoming, starts_at: upcoming[0]?.starts_at, ends_at: upcoming[0]?.ends_at };
  }).filter((e: any) => e.occurrences.length).sort((a: any,b: any) => a.starts_at.localeCompare(b.starts_at));
}
