# Listings and confirmed performances

A listing is the show or recurring series at one venue in one city. Its approved performances live in the existing `event_occurrences` table. Titles are matched conservatively (case, accents and whitespace normalized); no dates or venue names are stripped from titles. An explicitly supplied CSV `series_title` can name a recurring series consistently. Different venues never merge. The source export preserves full explicit occurrence timestamps in both its CSV performance rows and occurrence export, including two starts on one day. Distinct full UTC start instants remain distinct, including multiple performances on one day. Identical instants from different sources collapse to one occurrence. No dates are generated between the first and last performance.

The public listing API groups existing duplicate listings without rewriting the database. The oldest record (then ID) supplies the shared slug and content. Old detail slugs resolve to the same group and full upcoming schedule. Listing date filters match any occurrence; `view=calendar` returns one entry per performance, all pointing to that shared slug. Date-only filters use Lisbon calendar dates, including daylight saving time. `/api/events/combined` now uses the same approved database calendar rather than publishing CSV data separately.

Category pages and map pins use the same shared upcoming schedules, so later performances remain discoverable after the first date has passed. The detail page shows every upcoming confirmed start and end. The calendar keeps two same-day entries, and the listing page renders each listing once, including promotional sections.

## Import and approval

All CSV import entry points stage pending submissions, including the admin CSV button and legacy CLI wrapper. Nothing is published by importing. Each performance must be explicitly approved. Approval adds an occurrence to an existing matching show/venue or creates a new listing for the first performance. Repeated approval/import is idempotent for that instant. Existing confirmed starts are preserved when adding occurrences to legacy listings.

Canceled CSV sessions (`status` or `event_status` equal to `canceled`/`cancelled`, or `is_cancelled`/`is_canceled` true) are skipped. This is not authorization to delete already-published performances; live cancellations need review.

For conflicting source times, do not guess that every same-day row is the same performance: two performances on a day can be legitimate. When source verification establishes two rows refer to the same performance, supply the same `performance_key` and set `time_authority` to `organizer` or `ticket` on the row transcribed from that page. The importer prefers those verified rows. Contradictory authoritative times, or conflicts without authoritative verification, are excluded and recorded under `time_conflicts` in the import report for review. These fields describe provenance supplied by the operator; the importer does not claim to have independently fetched or verified that page. Without a performance key, differing times remain separate pending submissions for manual review.

## Schema review before deployment

`sql/series-occurrences.sql` is a reviewable migration, **not applied to production**. It replaces the exact legacy unique constraint on `(event_slug, occurrence_date)` with uniqueness on `(event_slug, starts_at)`. This permits two performances per day and supports idempotent upserts. It reuses the existing columns and table. The migration fails on pre-existing duplicate instants rather than silently deleting data. If a deployment uses a standalone date-only unique index instead of a constraint, inspect and adapt that index explicitly before applying; this script does not remove unknown indexes or constraints.

The production schema must be inspected before deployment. The isolated schema fixture models the existing API column contract, not a verified production schema. Existing records and duplicate conflicts must be reviewed first. No live data changes or deployment are authorized by this implementation.

## Read-only duplicate report

```sh
node scripts/ingest/series_dry_run.mjs https://lisbon-events-psi.vercel.app /tmp/live-series-dry-run.json
# Or use a previously downloaded public API snapshot:
node scripts/ingest/series_dry_run.mjs /tmp/live-events.json /tmp/live-series-dry-run.json
```

The script uses only a public GET, writes a local JSON proposal, and makes zero database writes. For each duplicate group it records original IDs/slugs, proposed shared slug, every observed showtime, source/ticket URLs, and possible conflicting times requiring verification. It flags possible response truncation. The report covers returned public listings, not a private database audit. Review source pages before treating observed times as confirmed or executing any consolidation.

Live audit update: the public site is now reachable. A read-only audit of 18 upcoming database records and 698 public CSV records is saved in [the live dry-run report](reports/live-series-audit-2026-11-16.md). Organizer/ticket verification remains blocked for Visit Lisboa and AgendaLX. Life in Lisboa and Quiz Knights were not found in the inspected public responses; their test fixtures remain synthetic. No live data changes were performed.

## Isolated validation

Run `npm ci` then `bash tests/workflow/run.sh`. The runner builds the production app using only fixed local test credentials, starts disposable PostgreSQL/PostgREST containers with a 1,000-row response cap, applies the occurrence migration only there, runs both workflow suites with Chromium, and tears everything down. No production credentials, paid geocoding, enrichment APIs, deployment or live writes are used.

The series suite covers the Selva model (one listing with Dec 12 and Dec 19 performances), two performances on the same day, Quiz Knights at two venues, canceled-session exclusion, same-instant cross-source duplication, repeated imports/approvals, date-only and Lisbon summer filters, and calendar links to the shared detail page. It uses the year 2099 and synthetic times to remain deterministic and avoid claiming real showtime verification.

Limits: no production RLS/schema/trigger verification; no concurrent-import guarantee without a database-wide identity contract; grouping is conservative by normalized title/venue/city and is not fuzzy matching; source conflicts require operator evidence and review. Exact source-time changes to already-approved performances must be reviewed rather than silently overwriting another confirmed instant.

Validation result (November 16, 2026): production build/type validation, the original workflow suite, and the new series suite passed against fresh disposable databases. Chromium verified listing uniqueness, detail schedules, date inputs, two same-day calendar entries and navigation to their shared detail page. API checks also verified legacy slug aliases and grouping existing duplicate records. Source-helper checks verified that parsed times take precedence over raw date-only metadata. The dry-run generator passed on synthetic snapshots; live source verification remains incomplete as recorded in `live-series-dry-run-status.json`. The standalone dry-run reporter regression test is `node tests/workflow/report-check.mjs`; it verifies missing-venue safety, date-only precision, distinct same-day starts and snapshot provenance.
