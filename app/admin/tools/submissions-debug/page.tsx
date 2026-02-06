"use client";
import { adminGetJSON, adminPostJSON } from "@/lib/adminFetch";

import * as React from "react";

type Submission = {
  id: number;
  status: string;
  title?: string;
  start?: string;
  end?: string;
  venue?: string;
  city?: string;
  address?: string;
  price?: string;
  category?: string;
  description?: string;
  organizer?: string;
  source_url?: string;
  tags?: string;
  recurrence_note?: string;
};

export default function SubmissionsAdminPage() {
  const [subs, setSubs] = React.useState<Submission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  async function expectJSON(res: Response) {
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text();
      throw new Error(
        `Expected JSON but got ${res.status} ${res.statusText}. ` +
        `Check that /api/admin/submissions/list exists. First bytes: ${text.slice(0, 120)}`
      );
    }
    return res.json();
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetJSON<{ items: any[] }>("/api/admin/submissions/list");
      const j = await expectJSON(res);
      if (!res.ok) throw new Error(j.error || res.statusText);
      setSubs(j.items || []);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);


  async function approve(id: number) {
    try {
      await adminPostJSON("/api/admin/submissions/approve", { id, reviewer: "admin", notes: "" });
      await load();
      alert("Approved + published");
    } catch (e: any) {
      alert(`Approve failed: ${e.message || e}`);
    }
  }

  async function reject(id: number) {
    try {
      const notes = prompt("Optional note for rejection") || "";
      await adminPostJSON("/api/admin/submissions/reject", { id, reviewer: "admin", notes });
      await load();
      alert("Rejected");
    } catch (e: any) {
      alert(`Reject failed: ${e.message || e}`);
    }
  }

  if (loading) return <main className="p-6">Loading…</main>;
  if (error)   return (
    <main className="p-6">
      <p className="text-red-700 font-medium">Error: {error}</p>
      <p className="text-sm mt-2">
        Tip: open <code>/api/admin/submissions/list</code> directly in your browser.
        If that shows HTML or 404, the API route path or build is wrong.
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
              <div>
                <div className="font-medium">
                  {s.title || "(no title)"}{" "}
                  <span className="text-xs text-gray-500">#{s.id}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {s.start} {s.venue ? `@ ${s.venue}` : ""}
                </div>
                {s.description ? (
                  <p className="mt-2 text-sm">{s.description}</p>
                ) : null}
                {s.source_url ? (
                  <a className="text-sm underline" href={s.source_url} target="_blank" rel="noreferrer">
                    Source
                  </a>
                ) : null}
              </div>
              <div className="flex gap-2">
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
