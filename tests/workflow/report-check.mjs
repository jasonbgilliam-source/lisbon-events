import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const dir = mkdtempSync(path.join(tmpdir(), 'lisbon-report-test-'));
const base = { city: 'Lisbon', status: 'approved' };
const items = [
 ...['a', 'b'].map(id => ({ ...base, id, slug: id, title: 'Date-only exhibition', location_name: 'MAAT', starts_at: '2099-03-25', ends_at: '2099-08-31' })),
 ...['c', 'd'].map((id, i) => ({ ...base, id, slug: id, title: 'Same-day show', location_name: 'Selva', starts_at: `2099-12-12T${i ? '20' : '17'}:00:00Z` })),
 ...['e', 'f'].map(id => ({ ...base, id, slug: id, title: 'Unknown venue show', starts_at: '2099-12-12T19:00:00Z' })),
 ...['LX Brewery', 'Kossies'].map((location_name, i) => ({ ...base, id: `quiz-${i}`, slug: `quiz-${i}`, title: 'Quiz Knights', location_name, starts_at: '2099-12-12T19:00:00Z' })),
 ...['x', 'y'].map(id => ({ ...base, status: 'cancelled', id, slug: id, title: 'Canceled unknown venue', starts_at: '2099-12-12T19:00:00Z' })),
];
try {
 const input = path.join(dir, 'input.json'), output = path.join(dir, 'report.json');
 const snapshot = { items, source_url: 'https://example.invalid/public-snapshot', record_kind: 'synthetic', captured_at: '2099-01-01T00:00:00Z', snapshot_sha256: 'test-fingerprint' };
 writeFileSync(input, JSON.stringify(snapshot));
 execFileSync(process.execPath, ['scripts/ingest/series_dry_run.mjs', input, output], { stdio: 'inherit' });
 const report = JSON.parse(readFileSync(output, 'utf8'));
 assert.equal(report.source, snapshot.source_url);
 assert.equal(report.snapshot_sha256, snapshot.snapshot_sha256);
 assert.equal(report.writes_performed, 0);
 assert.equal(report.groups.length, 2);
 const dateOnly = report.groups.find(g => g.title === 'Date-only exhibition').preserved_performances[0];
 assert.equal(dateOnly.starts_at, null);
 assert.equal(dateOnly.date, '2099-03-25');
 assert.equal(dateOnly.observed_run_ends_on, '2099-08-31');
 assert.equal(dateOnly.requires_source_verification, true);
 assert.equal(report.groups.find(g => g.title === 'Same-day show').preserved_performances.length, 2);
 assert.equal(report.manual_review_candidates.length, 1);
 assert.equal(report.manual_review_candidates[0].records.length, 2);
 assert.equal(report.manual_review_candidates[0].title, 'Unknown venue show');
 assert.equal(report.groups.some(g => g.title === 'Quiz Knights'), false);
 assert.deepEqual(JSON.parse(readFileSync(input, 'utf8')), snapshot, 'source snapshot remains unchanged');
 console.log('PASS: dry-run candidates, venue safety, date-only precision, same-day times and provenance.');
} finally { rmSync(dir, { recursive: true, force: true }); }
