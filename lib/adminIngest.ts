import path from 'node:path';
import { importSubmissions } from '@/scripts/ingest/enrich/import_merged_to_submissions.mjs';

// Importing is staging, never publishing. Each performance still needs approval.
export async function runAdminIngest() {
  const report = await importSubmissions({
    inputCsv: path.join(process.cwd(), 'public', 'events.csv'),
    onlyPendingReview: false, requireEnrichOk: false,
  });
  return {
    ok: true, mode: 'stage-current-csv',
    counts: {
      csv_events: report.input_row_count, pending_submissions: report.ready_to_insert_count,
      skipped: report.skipped_count, canceled: report.canceled_count,
      time_conflicts: report.time_conflicts.length,
    },
    skipped: report.skipped_sample,
  };
}
