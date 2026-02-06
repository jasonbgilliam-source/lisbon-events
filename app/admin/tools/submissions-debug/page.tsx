"use client";

import * as React from "react";
import { adminGetJSON, adminPostJSON } from "@/lib/adminFetch";

type Submission = {
  id: number;
  status?: string;

  title?: string;
  description?: string;

  // older UI fields (if your API returns them)
  start?: string;
  end?: string;
  venue?: string;

  // likely DB fields for submissions (if you return raw rows)
  starts_at?: string;
  ends_at?: string;
  location_name?: string;

  city?: string;
  address?: string;
  price?: string;
  category?: string;
  organizer?: string;
  organizer_email?: string;

  source_url?: string;
  ticket_url?: string;

  tags?: string;
  recurrence_note?: string;
};

function whenText(s: Submission) {
  const a = s.start || s.starts_at || "";
  const b = s.end || s.ends_at || "";
  if (a && b && a !== b) return `${a} – ${b}`;
  return a || b || "";
}

function whereText(s: Submission) {
  return s.venue || s.location_name || "";
}

function sourceLink(s: Submission) {
  return s.source_url || s.ticket_url || "";
}

export default function SubmissionsAdminPage() {
  const [subs, setSubs] = React.useState<Submission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetJSON<{ items: Submission[] }>("/api/admin/submissions/list");
      setSubs(data.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function approve(id: number) {
    try {
      await adminPostJSON("/api/admin/submissions/approve", {
        id,
        reviewer: "admin",
        notes: "",
      });
      await load();
      alert("Approved + published");
    } catch (e: any) {
      alert(`Approve failed: ${e?.message || e}`);
    }
  }

  async function reject(id: number) {
    try {
      const notes = prompt("Optional note for rejection") || "";
      await adminPostJSON("/api/admin/submissions/reject", {
        id,
        reviewer: "admin",
        notes,
      });
      await load();
      alert("Rejected");
    } catch (e: any) {
      alert(`Reject failed: ${e?.message || e}`);
    }
  }

  if (loading) return <main className="p-6">Loading…</main>;

  if (error)
    return (
      <main className="p-6">
        <p className="text-red-700 font-medium">Error: {error}</p>
        <p className="text-sm mt-2">
          Tip: open <code>/api/admin/submissions/list</code> directly in your browser.
          If that shows 401, your admin token env vars aren’t set.
        </p>
      </main>
    );

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Pending Event Submissions</h1>

      {subs.length === 0 ? <p>No pending submissions 🎉</p> : null}

      <ul className="space-y-4">
        {subs.map((s) => (
          <li key={s.id} className="border rounded p-4">
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <div className="font-medium">
                  {s.title || "(no title)"}{" "}
                  <span className="text-xs text-gray-500">#{s.id}</span>
                </div>

                <div className="text-sm text-gray-600">
                  {whenText(s)} {whereText(s) ? `@ ${whereText(s)}` : ""}
                </div>

                {s.description ? <p className="mt-2 text-sm">{s.description}</p> : null}

                {sourceLink(s) ? (
                  <a className="text-sm underline" href={sourceLink(s)} target="_blank" rel="noreferrer">
                    Source
                  </a>
                ) : null}
              </div>

              <div className="flex gap-2 shrink-0">
                <button className="border px-3 py-1 rounded" onClick={() => approve(s.id)}>
                  Approve
                </button>
                <button className="border px-3 py-1 rounded" onClick={() => reject(s.id)}>
                  Reject
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
