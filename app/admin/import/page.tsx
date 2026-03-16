"use client";

import * as React from "react";

const CSRF_HEADER_NAME = "x-le-csrf";
const CSRF_HEADER_VALUE = "1";

type SkippedRow = {
  slug: string;
  title: string;
  reason: string;
};

type IngestResult = {
  ok: boolean;
  error?: string;
  mode?: "import-current-csv";
  counts?: {
    csv_events: number;
    existing_events: number;
    prepared_upserts: number;
    inserted_or_updated: number;
    deduped_to_existing: number;
    skipped_invalid: number;
  };
  skipped?: SkippedRow[];
};

export default function AdminImportPage() {
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<IngestResult | null>(null);

  async function runImport() {
    setWorking(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/ingest/", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
        },
        body: JSON.stringify({}),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || `Failed (${res.status})`);
      }

      setResult(json);
    } catch (e: any) {
      setResult(null);
      setError(e?.message || "Failed to import current CSV");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin Import</h1>
          <p className="mt-2 text-sm text-gray-600">
            Import the current <code>public/events.csv</code> into the live site database.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Run <code>node scripts/ingest/run.mjs</code> in the terminal first, then click this button.
          </p>
        </div>

        <button
          onClick={runImport}
          disabled={working}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {working ? "Importing..." : "Import current CSV to site"}
        </button>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {result?.counts ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="CSV rows read" value={result.counts.csv_events} />
          <Stat label="Existing live events" value={result.counts.existing_events} />
          <Stat label="Prepared upserts" value={result.counts.prepared_upserts} />
          <Stat label="Inserted or updated" value={result.counts.inserted_or_updated} />
          <Stat label="Matched existing rows" value={result.counts.deduped_to_existing} />
          <Stat label="Skipped invalid rows" value={result.counts.skipped_invalid} />
        </div>
      ) : null}

      {result?.skipped && result.skipped.length > 0 ? (
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Skipped rows</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Slug</th>
                  <th className="py-2 pr-4">Reason</th>
                </tr>
              </thead>
              <tbody>
                {result.skipped.map((row, idx) => (
                  <tr key={`${row.slug}-${idx}`} className="border-b align-top">
                    <td className="py-2 pr-4">{row.title}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{row.slug}</td>
                    <td className="py-2 pr-4">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-gray-600">{label}</div>
    </div>
  );
}