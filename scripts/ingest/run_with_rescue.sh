#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "▶ Step 1: Base ingest"
node scripts/ingest/run.mjs

LATEST_EXPORT_STAMP="$(ls -1 tmp/ingest/export | tail -n 1)"
EXPORT_CSV="tmp/ingest/export/$LATEST_EXPORT_STAMP/events.csv"

echo ""
echo "▶ Step 2: Build rescue candidates"
node scripts/ingest/rescue_candidates.mjs "$EXPORT_CSV"

REVIEW_DIR="tmp/ingest/review/$LATEST_EXPORT_STAMP"
RESCUE_CSV="$REVIEW_DIR/rescue_candidates.csv"

if [[ ! -f "$RESCUE_CSV" ]]; then
  echo "❌ Rescue candidate file not found: $RESCUE_CSV"
  exit 1
fi

RESCUE_COUNT="$(python3 - <<PY
import csv
path = "$RESCUE_CSV"
with open(path, newline="", encoding="utf-8") as f:
    reader = csv.reader(f)
    rows = list(reader)
print(max(len(rows) - 1, 0))
PY
)"

echo "Rescue candidates found: $RESCUE_COUNT"

if [[ "$RESCUE_COUNT" -eq 0 ]]; then
  echo "✅ No rescue candidates. Base ingest complete."
  exit 0
fi

echo ""
echo "▶ Step 3: AI/web rescue enrichment"
ENRICH_INPUT_CSV="$RESCUE_CSV" \
ENRICH_BATCH_LIMIT="${ENRICH_BATCH_LIMIT:-50}" \
ENRICH_MIN_EVENT_SCORE="${ENRICH_MIN_EVENT_SCORE:-0}" \
node scripts/ingest/enrich/serpapi_openai_batch.mjs

LATEST_PATCH="$(ls -1 tmp/ingest/enriched/serpapi_openai_patch_*.csv | tail -n 1)"

echo ""
echo "▶ Step 4: Guarded merge of rescue results"
MERGE_EXPORT_CSV="$EXPORT_CSV" \
MERGE_PATCH_CSV="$LATEST_PATCH" \
MERGE_MAX_PAST_DAYS="${MERGE_MAX_PAST_DAYS:-30}" \
node scripts/ingest/merge_rescues.mjs

LATEST_CHANGED="$(ls -1 tmp/ingest/merged/changed_rows_only_*.csv | tail -n 1)"
LATEST_MERGE_REPORT="$(ls -1 tmp/ingest/merged/merge_report_*.json | tail -n 1)"
LATEST_REJECTED="$(ls -1 tmp/ingest/merged/merge_rejected_*.json | tail -n 1)"

CHANGED_COUNT="$(python3 - <<PY
import csv
path = "$LATEST_CHANGED"
with open(path, newline="", encoding="utf-8") as f:
    reader = csv.reader(f)
    rows = list(reader)
print(max(len(rows) - 1, 0))
PY
)"

echo "Changed rows ready for import: $CHANGED_COUNT"

if [[ "$CHANGED_COUNT" -eq 0 ]]; then
  echo "✅ No accepted rescue rows to import."
  echo "Merge report:    $LATEST_MERGE_REPORT"
  echo "Rejected rescues:$LATEST_REJECTED"
  exit 0
fi

echo ""
echo "▶ Step 5: Import rescued changed rows to event_submissions"
IMPORT_INPUT_CSV="$LATEST_CHANGED" \
IMPORT_ONLY_PENDING_REVIEW=false \
IMPORT_REQUIRE_ENRICH_OK=false \
node scripts/ingest/enrich/import_merged_to_submissions.mjs

LATEST_IMPORT_REPORT="$(ls -1 tmp/ingest/imports/import_to_event_submissions_report_*.json | tail -n 1)"

echo ""
echo "✅ Full ingest + rescue flow complete"
echo "Export CSV:          $EXPORT_CSV"
echo "Rescue CSV:          $RESCUE_CSV"
echo "Patch CSV:           $LATEST_PATCH"
echo "Changed rows CSV:    $LATEST_CHANGED"
echo "Merge report:        $LATEST_MERGE_REPORT"
echo "Rejected rescues:    $LATEST_REJECTED"
echo "Import report:       $LATEST_IMPORT_REPORT"
