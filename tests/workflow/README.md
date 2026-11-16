# Isolated import and approval regression test

Run from the repository root:

```sh
npm ci
bash tests/workflow/run.sh
```

Requires Docker, Node/npm, curl, setsid, and Chromium. The test uses `/usr/bin/chromium` when installed; otherwise install Playwright Chromium with `npx playwright install chromium`. Ports 3100, 54321 and 54322 must be free. Stop any development server before running: the production build shares `.next` with development.

The runner creates fresh PostgreSQL 16 and PostgREST 12 containers, builds the app, starts the production server, runs the checks, and removes its containers/network and stops its processes on exit. Logs remain in the printed `/tmp/lisbon-workflow-logs.*` directory. Container images are pinned by digest. No persistent database volume is created.

Only synthetic data and fixed local test credentials are used. Build/server processes receive a clean environment; the runner refuses checkouts containing `.env*` files because Next loads these independently. The importer receives only test settings. Browser requests to external hosts are blocked. Approval uses the existing citywide option, so Google geocoding and paid services are not called. No production migrations, credentials, data, deployments, or paid resources are used.

`schema.sql` is an application-contract fixture, not a production migration or a verified copy of the production schema. `rest-proxy.mjs` adapts Supabase's `/rest/v1` path to local PostgREST and removes the synthetic Authorization header; the isolated REST role is local superuser. This exercises real PostgreSQL timestamp serialization, database constraints, PostgREST pagination, the actual importer, Next API routes and rendered pages. It does **not** validate Supabase Auth, RLS, production schema/triggers, concurrent imports, scraper/enrichment providers, or venue-specific Google geocoding. A simultaneous pair of imports can still race without a database uniqueness contract; this change addresses sequential re-imports.

## Assertions

- Duplicate CSV rows yield one pending submission.
- Import preserves source and ticket URLs separately.
- Re-import of pending submissions creates no duplicates despite timezone formatting differences.
- Pending submissions are absent from public listings.
- Approval rejects unauthenticated requests (401) and missing CSRF headers (403).
- An authenticated reviewer explicitly approves the submission using the production approval route and citywide override.
- Approval updates the submission status and creates a published event with its slug.
- Public listing/detail APIs contain the approved event and preserved description/source.
- Re-import after approval adds neither submissions nor public events.
- Re-import after archiving the submission still matches the published event.
- With PostgREST capped at 1,000 rows, re-import also deduplicates a submission outside the first page.
- Chromium renders the event in the listing and the heading/description on its detail page.

## Reproduced before fixes

Starting point: `rebuild-v2`, commit `799cbca80d030daf96a55164acda887b643c44e6`.

1. `source_url` was null after import, preventing approval without manually restoring it.
2. A second import produced two submissions because `.000Z` and `+00:00` timestamps generated different deduplication keys.
3. With a 1,000-row PostgREST cap, a submission after the first page was inserted again because `.limit(5000)` did not retrieve all records.

The fixes preserve the source URL, normalize timestamp instants, and paginate both existing submissions and published events in stable ID order. No dependency or database schema changes are required.

## Validation results

On November 16, 2026, the original branch passed a production build with placeholder settings. After these fixes, the isolated workflow runner passed against a fresh database and a production server, including Chromium listing/detail checks and re-imports with the 1,000-row response cap enforced. The production build also completed its TypeScript check. JavaScript syntax, shell syntax, and `git diff --check` passed.
