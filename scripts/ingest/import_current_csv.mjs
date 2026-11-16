import path from 'node:path';
import { importSubmissions } from './enrich/import_merged_to_submissions.mjs';
// Legacy entry point now stages pending submissions instead of bypassing review.
importSubmissions({ inputCsv: path.join(process.cwd(), 'public', 'events.csv'),
  onlyPendingReview: false, requireEnrichOk: false,
}).catch(error => { console.error(error); process.exitCode = 1; });
