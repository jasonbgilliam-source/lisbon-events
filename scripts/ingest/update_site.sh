#!/bin/bash

set -e

echo "▶ Running ingest pipeline..."

node scripts/ingest/run.mjs

echo "▶ Finding latest export..."

LATEST=$(ls -1 tmp/ingest/export | tail -n 1)

echo "▶ Updating site CSV files..."

cp tmp/ingest/export/$LATEST/events.csv public/events.csv
cp tmp/ingest/export/$LATEST/event_occurrences.csv public/event_occurrences.csv

echo "▶ Done"
echo "Latest export: $LATEST"
echo "Site CSV updated"