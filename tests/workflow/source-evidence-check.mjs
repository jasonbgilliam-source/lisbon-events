import { normalizeCanonicalEvent, buildRowsFromCanonical } from '../../scripts/ingest/run.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canceled, seriesKey, resolveImportPerformances, confirmedPerformances } from '../../lib/eventSeries.mjs';
const { sources } = JSON.parse(readFileSync(new URL('../fixtures/recurring-source-evidence.json', import.meta.url), 'utf8'));
const lx = sources.lx.events[0], kossies = sources.kossies.events[0];
assert.equal(lx.startDate, '2026-11-21T20:00:00Z');
assert.equal(lx.endDate, '2026-11-21T22:00:00Z');
assert.equal(canceled(lx), false);
assert.equal(kossies.startDate, '2026-11-15T14:00:00Z');
assert.equal(canceled(kossies), true, 'Meetup Schema.org EventCancelled must be excluded');
assert.equal(canceled({ event_status: 'https://schema.org/EventCancelled' }), true);
assert.equal(canceled({ status: 'cancelled' }), true);
assert.equal(canceled({ eventStatus: 'https://schema.org/EventScheduled' }), false);
const quiz = (e) => ({ title: 'Quiz Knights', location_name: e.location.name, city: e.location.city, starts_at: e.startDate, eventStatus: e.eventStatus });
assert.notEqual(seriesKey(quiz(lx)), seriesKey(quiz(kossies)), 'same organizer, different venues remain separate');
assert.equal(resolveImportPerformances([quiz(lx), quiz(kossies)]).accepted.length, 1);
assert.equal(confirmedPerformances(quiz(kossies)).length, 0);
const normalizedCanceled = normalizeCanonicalEvent('meetup', quiz(kossies));
assert.equal(normalizedCanceled.status, 'cancelled');
assert.equal(buildRowsFromCanonical([normalizedCanceled]).length, 0, 'source normalization must not lose cancellation before CSV export');
assert.deepEqual(sources.hapsy.events.map(e => e.startDate.slice(0,10)), ['2026-12-12','2026-12-19']);
assert.ok(sources.hapsy.events.every(e => e.startDate.includes('T20:30:00')));
assert.equal(sources.hapsy.description_schedule.show_starts, '21:00');
assert.equal(sources.hapsy.description_schedule.ticket_verification_complete, false);
const base = { title: 'Life in Lisboa', location_name: 'Selva', city: 'Lisbon', performance_key: '2026-12-12-evening' };
const contradictory = [
 { ...base, starts_at: '2026-12-12T20:30:00Z', time_authority: 'aggregator' },
 { ...base, starts_at: '2026-12-12T21:00:00Z', time_authority: 'aggregator' },
];
assert.equal(resolveImportPerformances(contradictory).accepted.length, 0, 'unverified doors/show conflict must not auto-publish either start');
assert.equal(resolveImportPerformances(contradictory).conflicts.length, 1);
console.log('PASS: verified Meetup status/times, venue separation and unresolved Selva doors/show conflict.');
