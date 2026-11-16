// Shared by read APIs, approval, and the read-only duplicate report.
export function normalized(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
export function seriesKey(row) {
  // Never merge venues or infer recurrence by stripping dates from titles.
  const title = normalized(row.series_title || row.title);
  const venue = normalized(row.location_name);
  const city = normalized(row.city).replace(/^lisboa$/, 'lisbon');
  return title && venue ? [title, venue, city].join('::') : `record::${row.id || row.slug}`;
}
export function canceled(row) {
  return [row.is_cancelled, row.is_canceled].some(v => v === true || normalized(v) === 'true') ||
    [row.status, row.event_status, row.eventStatus].some(v =>
      ['cancelled', 'canceled', 'eventcancelled', 'eventcanceled'].includes(normalized(v).split(/[\/#]/).pop()));
}
export function iso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
export function lisbonDate(value) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
export function performances(event, occurrences) {
  const rows = occurrences.filter(o => o.event_slug === event.slug);
  // Only legacy records without occurrence rows fall back to their single start.
  const source = rows.length ? rows : [{ starts_at: event.starts_at, ends_at: event.ends_at, is_all_day: event.all_day }];
  return source.filter(o => !canceled(o) && iso(o.starts_at)).map(o => ({
    ...o, event_slug: event.slug, starts_at: iso(o.starts_at), ends_at: iso(o.ends_at),
    occurrence_date: lisbonDate(o.starts_at), is_all_day: o.is_all_day ?? false,
  }));
}
export function groupEvents(events, occurrences = []) {
  const groups = new Map();
  const occurrencesBySlug = new Map();
  for (const o of occurrences) {
    if (!occurrencesBySlug.has(o.event_slug)) occurrencesBySlug.set(o.event_slug, []);
    occurrencesBySlug.get(o.event_slug).push(o);
  }
  const sorted = [...events].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')) || String(a.id).localeCompare(String(b.id)));
  for (const event of sorted) {
    if (canceled(event) || (event.status && event.status !== 'approved')) continue;
    const key = seriesKey(event);
    if (!groups.has(key)) groups.set(key, { ...event, members: [], occurrences: [] });
    const group = groups.get(key);
    group.members.push({ id: event.id, slug: event.slug });
    group.occurrences.push(...performances(event, occurrencesBySlug.get(event.slug) || []));
  }
  return [...groups.values()].map(group => {
    // Full instants, not dates: two shows on the same day must survive.
    const unique = new Map();
    for (const o of group.occurrences) {
      const old = unique.get(o.starts_at);
      unique.set(o.starts_at, { ...o, ends_at: old?.ends_at || o.ends_at, event_slug: group.slug });
    }
    return { ...group, occurrences: [...unique.values()].sort((a, b) => a.starts_at.localeCompare(b.starts_at)) };
  });
}
export function matchesWindow(o, from, to) {
  const start = Date.parse(o.starts_at);
  const end = o.ends_at ? Date.parse(o.ends_at) : start;
  const lower = !from || (/^\d{4}-\d{2}-\d{2}$/.test(from) ? lisbonDate(o.ends_at || o.starts_at) >= from : end >= Date.parse(from));
  const upper = !to || (/^\d{4}-\d{2}-\d{2}$/.test(to) ? lisbonDate(o.starts_at) <= to : start <= Date.parse(to));
  return lower && upper;
}

// Different start times are distinct performances unless source data explicitly
// identifies them as the same performance. Never guess from the calendar date.
export function resolveImportPerformances(rows) {
  const accepted = [], conflicts = [], canceledRows = [];
  const keyed = new Map();
  for (const row of rows) {
    if (canceled(row)) { canceledRows.push(row); continue; }
    if (!row.performance_key) { accepted.push(row); continue; }
    const key = `${seriesKey(row)}::${row.performance_key}`;
    if (!keyed.has(key)) keyed.set(key, []);
    keyed.get(key).push(row);
  }
  for (const [key, candidates] of keyed) {
    const trusted = candidates.filter(r => ['organizer', 'ticket'].includes(normalized(r.time_authority)));
    const pool = trusted.length ? trusted : candidates;
    const instants = new Set(pool.map(r => iso(r.starts_at)));
    if (instants.size !== 1 || instants.has(null)) {
      conflicts.push({ key, reason: 'conflicting_times_require_organizer_or_ticket_verification', candidates });
    } else {
      accepted.push(pool[0]);
    }
  }
  return { accepted, conflicts, canceledRows };
}

// Preserve explicitly supplied source occurrences at full precision; never expand
// a series start/end range into invented daily performances.
export function confirmedPerformances(event) {
  if (canceled(event)) return [];
  // Parsed timestamps take precedence over raw date-only metadata for the same source.
  let entries = Array.isArray(event.occurrences) && event.occurrences.length ? event.occurrences :
    (Array.isArray(event.raw_occurrences) ? event.raw_occurrences : []);
  if (!entries.length) entries = [{ starts_at: event.starts_at, ends_at: event.ends_at, is_all_day: event.all_day }];
  const unique = new Map();
  for (const entry of entries) {
    const o = typeof entry === 'string' ? { starts_at: entry } : entry;
    if (!o || canceled(o)) continue;
    const rawStart = o.starts_at || o.date;
    const start = iso(rawStart);
    if (!start) continue;
    unique.set(start, { starts_at: start, ends_at: iso(o.ends_at),
      is_all_day: o.is_all_day === true || o.all_day === true || /^\d{4}-\d{2}-\d{2}$/.test(rawStart),
      occurrence_date: lisbonDate(start) });
  }
  return [...unique.values()].sort((a,b) => a.starts_at.localeCompare(b.starts_at));
}
