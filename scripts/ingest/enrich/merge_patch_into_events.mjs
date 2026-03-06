import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const INPUT_CSV = process.env.MERGE_INPUT_CSV || process.argv[2];
const PATCH_CSV = process.env.MERGE_PATCH_CSV || process.argv[3];
const OUTPUT_DIR =
  process.env.MERGE_OUTPUT_DIR || path.join("tmp", "ingest", "merged");

if (!INPUT_CSV || !PATCH_CSV) {
  console.error(
    'Usage: MERGE_INPUT_CSV="tmp/ingest/export/.../events.csv" MERGE_PATCH_CSV="tmp/ingest/enriched/...patch.csv" node scripts/ingest/enrich/merge_patch_into_events.mjs'
  );
  process.exit(1);
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate()
  )}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(
    d.getUTCSeconds()
  )}Z`;
}

function readCsv(csvPath) {
  const txt = fs.readFileSync(csvPath, "utf8");
  const parsed = Papa.parse(txt, { header: true, skipEmptyLines: true });
  return parsed.data || [];
}

function writeCsv(filePath, rows, columns) {
  const csv = Papa.unparse(rows, {
    quotes: true,
    columns,
  });
  fs.writeFileSync(filePath, csv, "utf8");
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

function isBlank(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

function normalizeKeyPart(v) {
  return String(v || "").trim().toLowerCase();
}

function patchKey(row) {
  return `${normalizeKeyPart(row.source)}::${normalizeKeyPart(row.source_id)}`;
}

function cleanBool(v) {
  const s = String(v || "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

const FIELD_MAP = [
  ["resolved_title", "title"],
  ["starts_at", "starts_at"],
  ["ends_at", "ends_at"],
  ["start_time", "start_time"],
  ["end_time", "end_time"],
  ["venue_name", "venue_name"],
  ["location_name", "location_name"],
  ["address", "address"],
  ["city", "city"],
  ["price", "price"],
  ["currency", "currency"],
  ["image_url", "image_url"],
  ["ticket_url", "ticket_url"],
];

const META_COLUMNS = [
  "enrichment_review_status",
  "enrichment_needs_review",
  "enrichment_enrich_ok",
  "enrichment_patch_source",
  "enrichment_query_title",
  "enrichment_chosen_url",
  "enrichment_source_notes",
  "enrichment_candidate_score",
  "enrichment_candidate_strong_signals",
  "enrichment_candidate_reasons",
  "enrichment_patch_merged_at",
  "enrichment_filled_fields",
];

const EXTRA_OUTPUT_COLUMNS = [
  "start_time",
  "end_time",
  "venue_name",
  "currency",
  "ticket_url",
];

function collectBaseColumns(rows) {
  const seen = new Set();
  const cols = [];

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        cols.push(key);
      }
    }
  }

  return cols;
}

function buildOutputColumns(baseColumns) {
  const cols = [...baseColumns];

  for (const col of EXTRA_OUTPUT_COLUMNS) {
    if (!cols.includes(col)) cols.push(col);
  }

  for (const col of META_COLUMNS) {
    if (!cols.includes(col)) cols.push(col);
  }

  return cols;
}

function ensureColumns(rows, columns) {
  return rows.map((row) => {
    const out = { ...row };
    for (const col of columns) {
      if (!(col in out)) out[col] = "";
    }
    return out;
  });
}

function mergeCanonicalUrlFallback(merged, patchRow, filledFields) {
  const canonical = firstNonEmpty(patchRow.canonical_url);
  if (!canonical) return;

  if ("canonical_url" in merged) {
    if (isBlank(merged.canonical_url)) {
      merged.canonical_url = canonical;
      filledFields.push("canonical_url");
    }
    return;
  }

  if ("url" in merged && isBlank(merged.url)) {
    merged.url = canonical;
    filledFields.push("url");
  }
}

function mergeOneRow(baseRow, patchRow, stamp) {
  const merged = { ...baseRow };
  const filledFields = [];
  const skippedPopulated = [];
  const patchHadUsefulData = [];
  const enrichOk = cleanBool(patchRow.enrich_ok);

  if (enrichOk) {
    for (const [patchField, destField] of FIELD_MAP) {
      const patchVal = firstNonEmpty(patchRow[patchField]);
      if (!patchVal) continue;

      patchHadUsefulData.push(destField);

      if (isBlank(merged[destField])) {
        merged[destField] = patchVal;
        filledFields.push(destField);
      } else {
        skippedPopulated.push(destField);
      }
    }

    mergeCanonicalUrlFallback(merged, patchRow, filledFields);
  }

  merged.enrichment_review_status = "pending_review";
  merged.enrichment_needs_review = cleanBool(patchRow.needs_review) ? "true" : "false";
  merged.enrichment_enrich_ok = enrichOk ? "true" : "false";
  merged.enrichment_patch_source = "serpapi_openai_patch";
  merged.enrichment_query_title = firstNonEmpty(patchRow.query_title);
  merged.enrichment_chosen_url = firstNonEmpty(patchRow.chosen_url);
  merged.enrichment_source_notes = firstNonEmpty(patchRow.source_notes);
  merged.enrichment_candidate_score = firstNonEmpty(patchRow.candidate_score);
  merged.enrichment_candidate_strong_signals = firstNonEmpty(
    patchRow.candidate_strong_signals
  );
  merged.enrichment_candidate_reasons = firstNonEmpty(patchRow.candidate_reasons);
  merged.enrichment_patch_merged_at = stamp;
  merged.enrichment_filled_fields = filledFields.join("|");

  return {
    merged,
    filledFields,
    skippedPopulated,
    patchHadUsefulData,
  };
}

function main() {
  const stamp = nowStamp();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const inputRowsRaw = readCsv(INPUT_CSV);
  const patchRows = readCsv(PATCH_CSV);

  const baseColumns = collectBaseColumns(inputRowsRaw);
  const outputColumns = buildOutputColumns(baseColumns);
  const inputRows = ensureColumns(inputRowsRaw, outputColumns);

  const patchMap = new Map();
  const duplicatePatchKeys = [];

  for (const patch of patchRows) {
    const key = patchKey(patch);
    if (!normalizeKeyPart(patch.source) || !normalizeKeyPart(patch.source_id)) {
      continue;
    }
    if (patchMap.has(key)) {
      duplicatePatchKeys.push(key);
      continue;
    }
    patchMap.set(key, patch);
  }

  let matchedRows = 0;
  let patchedRows = 0;
  let patchRowsWithNoMatch = 0;
  let totalFieldsFilled = 0;

  const unmatchedPatchKeys = new Set([...patchMap.keys()]);
  const mergedRows = [];
  const changedRows = [];

  for (const row of inputRows) {
    const key = patchKey(row);
    const patch = patchMap.get(key);

    if (!patch) {
      mergedRows.push(row);
      continue;
    }

    matchedRows += 1;
    unmatchedPatchKeys.delete(key);

    const result = mergeOneRow(row, patch, stamp);
    mergedRows.push(result.merged);

    if (
      result.filledFields.length > 0 ||
      cleanBool(patch.needs_review) ||
      cleanBool(patch.enrich_ok)
    ) {
      patchedRows += 1;
      totalFieldsFilled += result.filledFields.length;

      changedRows.push({
        source: firstNonEmpty(row.source),
        source_id: firstNonEmpty(row.source_id),
        original_title: firstNonEmpty(row.title),
        query_title: firstNonEmpty(patch.query_title),
        chosen_url: firstNonEmpty(patch.chosen_url),
        enrich_ok: cleanBool(patch.enrich_ok),
        needs_review: cleanBool(patch.needs_review),
        filled_fields: result.filledFields,
        skipped_populated_fields: result.skippedPopulated,
      });
    }
  }

  patchRowsWithNoMatch = unmatchedPatchKeys.size;

  const mergedCsvPath = path.join(
    OUTPUT_DIR,
    `events_merged_${stamp}.csv`
  );
  const reportJsonPath = path.join(
    OUTPUT_DIR,
    `merge_report_${stamp}.json`
  );

  writeCsv(mergedCsvPath, mergedRows, outputColumns);
  writeJson(reportJsonPath, {
    created_at: stamp,
    input_csv: INPUT_CSV,
    patch_csv: PATCH_CSV,
    output_csv: mergedCsvPath,
    output_columns: outputColumns,
    input_row_count: inputRows.length,
    patch_row_count: patchRows.length,
    matched_rows: matchedRows,
    patched_rows: patchedRows,
    total_fields_filled: totalFieldsFilled,
    patch_rows_with_no_match: patchRowsWithNoMatch,
    duplicate_patch_keys: duplicatePatchKeys,
    changed_rows_sample: changedRows.slice(0, 50),
  });

  console.log(`Input rows:              ${inputRows.length}`);
  console.log(`Patch rows:              ${patchRows.length}`);
  console.log(`Matched rows:            ${matchedRows}`);
  console.log(`Patched rows:            ${patchedRows}`);
  console.log(`Total fields filled:     ${totalFieldsFilled}`);
  console.log(`Patch rows no match:     ${patchRowsWithNoMatch}`);
  console.log(`Duplicate patch keys:    ${duplicatePatchKeys.length}`);
  console.log(`\n✅ Merge complete`);
  console.log(`Merged CSV:   ${mergedCsvPath}`);
  console.log(`Merge report: ${reportJsonPath}`);
}

main();
