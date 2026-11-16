import { buildRowsFromCanonical, buildOccurrenceRows, dedupeCanonicalEvents } from '../../scripts/ingest/run.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Papa from 'papaparse';
import { resolveImportPerformances, groupEvents, matchesWindow, confirmedPerformances } from '../../lib/eventSeries.mjs';
const rest = 'http://127.0.0.1:54322/rest/v1';
const app = 'http://127.0.0.1:3100';
const dir = mkdtempSync(path.join(tmpdir(), 'lisbon-series-'));
const headers = { 'Content-Type': 'application/json', cookie: 'le_admin=local-admin-test-only', 'x-le-csrf': '1' };
async function json(url, options) {
 const res = await fetch(url, options); const data = await res.json();
 assert.ok(res.ok, `${res.status}: ${JSON.stringify(data)}`); return data;
}
async function rows(table) { return json(`${rest}/${table}?select=*`); }
const sourceEvidence = JSON.parse(readFileSync(new URL('../fixtures/recurring-source-evidence.json', import.meta.url), 'utf8'));
const base = { eventStatus: '', status: 'confirmed', title: 'Life in Lisboa', location_name: 'Selva', city: 'Lisbon', address: 'Test venue address',
 description: 'Synthetic test performance, not a verified live showtime.', category: 'Music', source_url: 'https://example.invalid/organizer',
 enrichment_review_status: 'pending_review', enrichment_enrich_ok: 'true' };
const data = [
 { ...base, starts_at: '2099-12-12T19:00:00Z' },
 { ...base, starts_at: '2099-12-19T19:00:00Z' },
 { ...base, title: 'Double bill', starts_at: '2099-12-12T17:00:00Z' },
 { ...base, title: 'Double bill', starts_at: '2099-12-12T20:00:00Z' },
 ...['LX Brewery', 'Kossies'].map(location_name => ({ ...base, title: 'Quiz Knights', location_name, starts_at: '2099-12-12T19:00:00Z' })),
 { ...base, starts_at: '2099-12-26T19:00:00Z', status: 'cancelled' },
 // The real Meetup cancellation shape, with a synthetic future date for repeatable UI tests.
 { ...base, title: 'Quiz Knights', location_name: 'Kossies café', starts_at: '2099-11-15T14:00:00Z',
   source_url: sourceEvidence.sources.kossies.url, eventStatus: sourceEvidence.sources.kossies.events[0].eventStatus },
 // A second source for the same instant is not another performance.
 { ...base, starts_at: '2099-12-12T19:00:00+00:00', source_url: 'https://example.invalid/aggregator' },
];
function runImport() {
 const csv = path.join(dir, 'series.csv'); writeFileSync(csv, Papa.unparse(data));
 execFileSync(process.execPath, ['scripts/ingest/enrich/import_merged_to_submissions.mjs'], { stdio: 'inherit',
  env: { PATH: process.env.PATH, SUPABASE_URL: 'http://127.0.0.1:54322', SUPABASE_SERVICE_ROLE_KEY: 'local-test-only', IMPORT_INPUT_CSV: csv, IMPORT_OUTPUT_DIR: dir } });
}
try {
 for (const table of ['event_occurrences', 'events', 'event_submissions']) await json(`${rest}/${table}?id=not.is.null`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
 runImport(); runImport();
 const submissions = await rows('event_submissions');
 assert.equal(submissions.length, 6);
 assert.ok(submissions.every(s => s.status === 'pending'));
 assert.equal((await json(`${app}/api/events/list/`)).items.length, 0, 'imports require approval');
 const slugs = new Map();
 for (const sub of submissions.sort((a,b) => a.starts_at.localeCompare(b.starts_at))) {
  const result = await json(`${app}/api/admin/submissions/approve/`, { method: 'POST', headers,
   body: JSON.stringify({ id: sub.id, reviewer: 'test reviewer', overrides: { is_citywide: true } }) });
  const key = `${sub.title}::${sub.location_name}`;
  if (slugs.has(key)) assert.equal(result.slug, slugs.get(key)); else slugs.set(key, result.slug);
 }
 assert.equal((await rows('events')).length, 4, 'one listing per series and venue');
 assert.equal((await rows('event_occurrences')).length, 6);
 assert.equal((await json(`${app}/api/events/map-pins/`)).pins.length, 4);
 runImport();
 assert.equal((await rows('event_submissions')).length, 6);
 const life = slugs.get('Life in Lisboa::Selva'); const double = slugs.get('Double bill::Selva');
 const list = (await json(`${app}/api/events/list/`)).items;
 assert.equal(list.filter(e => e.title === 'Life in Lisboa').length, 1);
 const detail = (await json(`${app}/api/events/by-slug/?slug=${life}`)).item;
 assert.deepEqual(detail.occurrences.map(o => o.occurrence_date), ['2099-12-12', '2099-12-19']);
 assert.equal((await json(`${app}/api/events/by-slug/?slug=${double}`)).item.occurrences.length, 2);
 for (const day of ['2099-12-12', '2099-12-19']) {
  const filtered = (await json(`${app}/api/events/list/?from=${day}&to=${day}`)).items;
  assert.equal(filtered.filter(e => e.slug === life).length, 1);
 }
 assert.equal((await json(`${app}/api/events/list/?from=2099-12-13&to=2099-12-18`)).items.length, 0, 'no invented dates between performances');
 const calendar = (await json(`${app}/api/events/combined/?from=2099-12-12&to=2099-12-12`)).items;
 assert.equal(calendar.filter(e => e.slug === double).length, 2);
 assert.equal(new Set(calendar.map(e => e.id)).size, calendar.length, 'same-day entry IDs are unique');
 assert.equal((await json(`${app}/api/events/list/?from=2099-12-26&to=2099-12-26`)).items.length, 0);
 // Re-approving is idempotent, including published occurrence writes.
 await json(`${app}/api/admin/submissions/approve/`, { method: 'POST', headers, body: JSON.stringify({ id: submissions[0].id, overrides: { is_citywide: true } }) });
 assert.equal((await rows('event_occurrences')).length, 6);
 await json(`${rest}/event_submissions?id=not.is.null`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
 runImport(); assert.equal((await rows('event_submissions')).length, 0, 'all published occurrence starts dedupe after archival');
 // Explicit same-performance evidence selects organizer/ticket time, never a date-only guess.
 const conflict = [
  { ...base, performance_key: 'dec12-evening', starts_at: '2099-12-12T18:00:00Z', time_authority: 'aggregator' },
  { ...base, performance_key: 'dec12-evening', starts_at: '2099-12-12T19:00:00Z', time_authority: 'organizer' },
 ];
 assert.equal(resolveImportPerformances(conflict).accepted[0].starts_at, conflict[1].starts_at);
 assert.equal(resolveImportPerformances(conflict.map(c => ({ ...c, time_authority: '' }))).conflicts.length, 1);
 assert.equal(resolveImportPerformances(conflict.map(c => ({ ...c, time_authority: 'ticket' }))).accepted.length, 0, 'conflicting authoritative pages require review');
 assert.equal(resolveImportPerformances(data).canceledRows.length, 2);
 const sourceEvents = dedupeCanonicalEvents([
  { ...base, starts_at: '2099-12-12T17:00:00Z', url: base.source_url },
  { ...base, starts_at: '2099-12-12T20:00:00Z', url: base.source_url },
 ]);
 const sourceRows = buildRowsFromCanonical(sourceEvents);
 assert.equal(sourceRows.length, 2);
 assert.equal(new Set(sourceRows.map(r => r.dedupe_key)).size, 2);
 assert.equal(new Set(sourceRows.map(r => r.canonical_key)).size, 2);
 assert.equal(buildOccurrenceRows(sourceEvents).length, 2);
 assert.equal(confirmedPerformances({ ...base, occurrences: [
  { starts_at: '2099-12-12T17:00:00Z' }, { starts_at: '2099-12-12T20:00:00Z' },
  { starts_at: '2099-12-19T19:00:00Z', status: 'canceled' },
 ] }).length, 2, 'source export preserves same-day shows and excludes cancellations');
 assert.equal(confirmedPerformances({ ...base, occurrences: [{ starts_at: '2099-12-12T19:00:00Z' }], raw_occurrences: ['2099-12-12'] }).length, 1, 'raw dates do not add a midnight performance beside a parsed showtime');
 assert.equal(confirmedPerformances({ ...base, starts_at: '2099-12-12T19:00:00Z', ends_at: '2099-12-19T19:00:00Z' }).length, 1, 'range bounds never generate daily recurrence');
 assert.equal(matchesWindow({ starts_at: '2099-06-15T23:30:00Z' }, '2099-06-16', '2099-06-16'), true, 'Lisbon summer date');
 // Dry-run grouping keeps old slugs as aliases and preserves both same-day instants.
 const legacy = groupEvents([
  { ...base, status: 'approved', id: 'a', slug: 'old-a', starts_at: '2099-12-12T17:00:00Z' },
  { ...base, status: 'approved', id: 'b', slug: 'old-b', starts_at: '2099-12-12T20:00:00Z' },
 ]);
 assert.equal(legacy.length, 1); assert.equal(legacy[0].occurrences.length, 2);
 const reportInput = path.join(dir, 'snapshot.json'), reportOutput = path.join(dir, 'report.json');
 writeFileSync(reportInput, JSON.stringify({ items: [
  { ...base, status: 'approved', id: 'live-like-a', slug: 'legacy-12', starts_at: '2099-12-12T19:00:00Z' },
  { ...base, status: 'approved', id: 'live-like-b', slug: 'legacy-19', starts_at: '2099-12-19T19:00:00Z' },
  ...data.filter(e => e.title === 'Quiz Knights').map((e, i) => ({ ...e, status: 'approved', id: `quiz-${i}`, slug: `quiz-${i}` })),
 ] }));
 execFileSync(process.execPath, ['scripts/ingest/series_dry_run.mjs', reportInput, reportOutput], { stdio: 'inherit' });
 const report = JSON.parse(readFileSync(reportOutput, 'utf8'));
 assert.equal(report.writes_performed, 0); assert.equal(report.groups.length, 1);
 assert.equal(report.proposed_listing_count, 3); assert.equal(report.groups[0].preserved_performances.length, 2);
 const { chromium } = await import('playwright');
 const browser = await chromium.launch({ headless: true, ...(existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}) });
 try {
  const page = await browser.newPage();
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto(`${app}/categories/music/`);
  await page.getByText('Life in Lisboa', { exact: true }).waitFor();
  assert.equal(await page.getByText('Life in Lisboa', { exact: true }).count(), 1);
  await page.goto(`${app}/events/`);
  await page.getByText('Life in Lisboa', { exact: true }).waitFor();
  assert.equal(await page.getByText('Life in Lisboa', { exact: true }).count(), 1);
  await page.getByLabel('From date').fill('2099-12-19'); await page.getByLabel('To date').fill('2099-12-19');
  await page.getByText('Life in Lisboa', { exact: true }).waitFor();
  await page.goto(`${app}/events/${life}/`);
  await page.getByRole('heading', { name: 'Upcoming performances' }).waitFor();
  assert.equal(await page.locator('time').count(), 2);
  await page.goto(`${app}/calendar/?date=2099-12-12`);
  await page.getByText('Double bill', { exact: true }).first().waitFor();
  assert.equal(await page.getByText('Double bill', { exact: true }).count(), 2);
  const links = page.getByRole('link', { name: 'Double bill', exact: true });
  assert.equal(await links.count(), 2);
  for (const href of await links.evaluateAll(nodes => nodes.map(n => n.getAttribute('href')))) {
   assert.equal(new URL(href, app).pathname.replace(/\/$/, ''), `/events/${double}`);
  }
  await links.first().click();
  await page.getByRole('heading', { name: 'Upcoming performances' }).waitFor();
  assert.equal(await page.locator('time').count(), 2);
 } finally { await browser.close(); }
 // Legacy duplicate slugs remain valid aliases of the shared detail schedule.
 await json(`${rest}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({ ...Object.fromEntries(['title','location_name','city','description','category','source_url'].map(k => [k, base[k]])),
   status: 'approved', slug: 'legacy-life-dec20', starts_at: '2099-12-20T19:00:00Z' }) });
 const alias = (await json(`${app}/api/events/by-slug/?slug=legacy-life-dec20`)).item;
 assert.equal(alias.slug, life); assert.equal(alias.occurrences.length, 3);
 assert.equal((await json(`${app}/api/events/list/`)).items.filter(e => e.title === base.title).length, 1);
 const aliasDay = (await json(`${app}/api/events/list/?view=calendar&from=2099-12-20&to=2099-12-20`)).items;
 assert.equal(aliasDay.length, 1); assert.equal(aliasDay[0].slug, life);
 console.log('PASS: shared series listings, confirmed performance entries, repeat imports, same-day performances, date filters, venue separation, cancellations and calendar links.');
} finally { rmSync(dir, { recursive: true, force: true }); }
