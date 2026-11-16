import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Papa from 'papaparse';

// Deliberately fixed loopback targets and synthetic credentials: never read production env.
const rest = 'http://127.0.0.1:54322/rest/v1';
const app = 'http://127.0.0.1:3100';
const dir = mkdtempSync(path.join(tmpdir(), 'lisbon-workflow-'));
const title = 'Isolated Lisbon concert';
const source = 'https://example.invalid/events/test-concert';
async function json(url, options) {
 const response = await fetch(url, options);
 const data = await response.json();
 assert.ok(response.ok, `${response.status}: ${JSON.stringify(data)}`);
 return data;
}
async function rows(table) { return json(`${rest}/${table}?select=*`); }
const fixture = {
 title, description: 'A synthetic event for the isolated approval workflow.',
 starts_at: '2099-06-15T19:00:00+01:00', ends_at: '2099-06-15T21:00:00+01:00',
 location_name: 'Test venue', city: 'Lisbon', address: 'Test address',
 category: 'Music', source_url: source, ticket_url: 'https://example.invalid/tickets',
 enrichment_review_status: 'pending_review', enrichment_enrich_ok: 'true',
};
function importCsv(row = fixture) {
 const file = path.join(dir, 'events.csv');
 writeFileSync(file, Papa.unparse([row, row])); // same-batch duplicate
 execFileSync(process.execPath, ['scripts/ingest/enrich/import_merged_to_submissions.mjs'], {
  stdio: 'inherit', env: { PATH: process.env.PATH, SUPABASE_URL: 'http://127.0.0.1:54322',
   SUPABASE_SERVICE_ROLE_KEY: 'local-test-only', IMPORT_INPUT_CSV: file, IMPORT_OUTPUT_DIR: dir },
 });
}
try {
 for (const table of ['events', 'event_submissions']) {
  await json(`${rest}/${table}?id=not.is.null`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
 }
 importCsv();
 let submissions = await rows('event_submissions');
 assert.equal(submissions.length, 1, 'same-batch deduplication');
 assert.equal(submissions[0].status, 'pending');
 assert.equal(submissions[0].source_url, source, 'import must preserve source required for approval');
 assert.equal(submissions[0].ticket_url, fixture.ticket_url);
 importCsv();
 assert.equal((await rows('event_submissions')).length, 1, 'pending re-import is idempotent across PostgreSQL timestamp formatting');
 assert.equal((await json(`${app}/api/events/list/`)).items.length, 0, 'pending is not public');
 const approve = `${app}/api/admin/submissions/approve/`;
 const body = JSON.stringify({ id: submissions[0].id, reviewer: 'isolated-test', overrides: { is_citywide: true } });
 assert.equal((await fetch(approve, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } })).status, 401);
 const headers = { 'Content-Type': 'application/json', cookie: 'le_admin=local-admin-test-only', 'x-le-csrf': '1' };
 assert.equal((await fetch(approve, { method: 'POST', body, headers: { ...headers, 'x-le-csrf': '' } })).status, 403);
 const approved = await json(approve, { method: 'POST', body, headers });
 assert.ok(approved.eventId);
 assert.equal((await rows('event_submissions'))[0].status, 'approved');
 const listing = await json(`${app}/api/events/list/`);
 assert.equal(listing.items.length, 1);
 assert.equal(listing.items[0].slug, approved.slug);
 const detail = await json(`${app}/api/events/by-slug/?slug=${encodeURIComponent(approved.slug)}`);
 assert.equal(detail.item.id, approved.eventId);
 assert.equal(detail.item.source_url, source);
 assert.equal(detail.item.description, fixture.description);
 importCsv();
 assert.equal((await rows('event_submissions')).length, 1);
 assert.equal((await rows('events')).length, 1);
 // Published records must also prevent reinsertion after submissions are archived.
 await json(`${rest}/event_submissions?id=not.is.null`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
 importCsv();
 assert.equal((await rows('event_submissions')).length, 0, 'published-event deduplication');
 assert.equal((await rows('events')).length, 1);
 // PostgREST's default response cap is 1000 even when limit(5000) is requested.
 await json(`${rest}/event_submissions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ title: `Existing ${i}`, starts_at: fixture.starts_at, location_name: 'Test venue' }))) });
 const beyondCap = { ...fixture, title: 'Concert beyond first database page' };
 importCsv(beyondCap);
 importCsv(beyondCap);
 const tail = await json(`${rest}/event_submissions?title=eq.${encodeURIComponent(beyondCap.title)}&select=*`);
 assert.equal(tail.length, 1, 'deduplication must scan beyond the server response cap');
 const { chromium } = await import('playwright');
 const browser = await chromium.launch({ headless: true, ...(existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}) });
 try {
  const page = await browser.newPage();
  // No external API calls, maps, analytics, fonts or paid services during browser tests.
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto(`${app}/events/`);
  await page.getByText(title, { exact: true }).first().waitFor();
  await page.goto(`${app}/events/${approved.slug}/`);
  await page.getByRole('heading', { name: title, exact: true }).waitFor();
  await page.getByText(fixture.description, { exact: true }).waitFor();
 } finally { await browser.close(); }
 console.log('PASS: import → manual approval → listing/detail APIs and browser → re-import; no duplicates.');
} finally { rmSync(dir, { recursive: true, force: true }); }
