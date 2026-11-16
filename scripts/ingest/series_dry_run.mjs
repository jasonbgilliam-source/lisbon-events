// Read-only grouping proposal. No Supabase credentials and no write operations.
import fs from 'node:fs';
import { groupEvents, lisbonDate, normalized, canceled } from '../../lib/eventSeries.mjs';

const [input, output = '/tmp/lisbon-series-dry-run.json'] = process.argv.slice(2);
if (!input) throw new Error('Usage: node scripts/ingest/series_dry_run.mjs <public-listing-json or https://site> [report.json]');
let snapshot;
if (input.startsWith('https://')) {
 const response = await fetch(`${input.replace(/\/$/, '')}/api/events/list/?limit=2000`);
 if (!response.ok) throw new Error(`Public listing read failed: HTTP ${response.status}. No report generated.`);
 snapshot = await response.json();
} else snapshot = JSON.parse(fs.readFileSync(input, 'utf8'));
const events = Array.isArray(snapshot) ? snapshot : snapshot.items;
if (!Array.isArray(events)) throw new Error('Expected public API items or an array of event records');
const occurrences = events.flatMap(e => (e.occurrences || []).map(o => ({ ...o, event_slug: e.slug })));
const groups = groupEvents(events, occurrences);
const proposals = groups.filter(g => g.members.length > 1).map(g => {
 const originals = events.filter(e => g.members.some(m => m.id === e.id));
 const byDay = new Map();
 for (const e of originals) {
  for (const p of (e.occurrences?.length ? e.occurrences : [e])) {
   if (!p.starts_at) continue;
   const day = lisbonDate(p.starts_at);
   if (!byDay.has(day)) byDay.set(day, []);
   byDay.get(day).push({ record_id: e.id, slug: e.slug, starts_at: p.starts_at, ends_at: p.ends_at || null,
    source_url: e.source_url || null, ticket_url: e.ticket_url || null });
  }
 }
 const verify = [...byDay].filter(([, rows]) => new Set(rows.map(r => new Date(r.starts_at).toISOString())).size > 1 && new Set(rows.map(r => r.source_url || r.ticket_url)).size > 1)
  .map(([date, candidates]) => ({ date, reason: 'Verify organizer/ticket page: conflicting source times or distinct same-day performances', candidates }));
 return { title: g.title, venue: g.location_name, city: g.city, proposed_shared_slug: g.slug,
  records_to_group: g.members, preserved_performances: g.occurrences.map(o => {
   const exact = originals.find(e => e.starts_at && new Date(e.starts_at).toISOString() === o.starts_at);
   const dateOnly = exact && /^\d{4}-\d{2}-\d{2}$/.test(exact.starts_at);
   return dateOnly ? { date: o.occurrence_date, starts_at: null, ends_at: null, observed_run_ends_on: exact.ends_at || null,
    time_precision: 'date_only_no_confirmed_clock_time', requires_source_verification: true } : o;
  }),
  observed_schedule_records: originals.map(e => ({ id: e.id, slug: e.slug, starts_at: e.starts_at, ends_at: e.ends_at || null })),
  source_records: originals.map(e => ({ id: e.id, slug: e.slug, source_url: e.source_url, ticket_url: e.ticket_url })),
  needs_source_verification: verify, action: 'proposal_only_no_writes' };
});
// Missing venues are not enough evidence to merge. Report these separately so
// suspicious duplicates are visible instead of implying that zero safe groups
// means there are no duplicates on the site.
const titleGroups = new Map();
for (const event of events) {
 if (canceled(event)) continue;
 const key = `${normalized(event.title)}::${normalized(event.city).replace(/^lisboa$/, 'lisbon')}`;
 if (!titleGroups.has(key)) titleGroups.set(key, []);
 titleGroups.get(key).push(event);
}
const manualReview = [...titleGroups.values()].filter(rows => rows.length > 1 && rows.some(e => !normalized(e.location_name)))
 .map(rows => ({ title: rows[0].title, reason: 'Missing venue: identity is unverified; do not merge automatically',
  records: rows.map(e => ({ id: e.id, slug: e.slug, venue: e.location_name || null, starts_at: e.starts_at || null,
   ends_at: e.ends_at || null, source_url: e.source_url || e.url || null, ticket_url: e.ticket_url || null })),
  action: 'manual_source_and_venue_review_no_writes' }));
const report = { generated_at: new Date().toISOString(), source: snapshot.source_url || input,
 source_kind: snapshot.record_kind || 'public_listing_snapshot', captured_at: snapshot.captured_at || null, snapshot_sha256: snapshot.snapshot_sha256 || null,
 scope: 'Public listings returned by the supplied API/snapshot; not a full private database audit.',
 potentially_truncated: events.length >= (snapshot.limit || 2000),
 input_records: events.length, proposed_listing_count: groups.length,
 policy: 'Same normalized title, venue and city; distinct instants preserved. Canceled records excluded. Never invent daily recurrence.',
 source_verification: 'Proposals require organizer/ticket verification before live data changes. Times listed here are observed, not independently verified.',
 groups: proposals, manual_review_candidates: manualReview, writes_performed: 0 };
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(`Dry run: ${events.length} records; ${proposals.length} groups; 0 writes. Report: ${output}`);
