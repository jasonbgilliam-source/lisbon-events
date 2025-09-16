"use client";

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

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/submissions/list");
      const j = await res.json();
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
    const reviewer = "admin";
    const notes = "";
    const res = await fetch("/api/submissions/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reviewer, notes })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) alert(`Approve failed: ${j.error || res.statusText}`);
    else { await load(); alert("Approved + published"); }
  }

  async function reject(id: number) {
    const reviewer = "admin";
    const notes = prompt("Optional note for rejection") || "";
    const res = await fetch("/api/submissions/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reviewer, notes })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) alert(`Reject failed: ${j.error || res.statusText}`);
    else { await load(); alert("Rejected"); }
  }

  if (loading) return <main className="p-6">Loading…</main>;
  if (error)   return <main className="p-6">Error: {error}</main>;

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Pending Event Submissions</h1>
      {subs.length === 0 ? <p>No pending submissions 🎉</p> : null}
      <ul className="space-y-4">
        {subs.map(s => (
          <li key={s.id} className="border rounded p-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="font-medium">{s.title || "(no title)"} <span className="text-xs text-gray-500">#{s.id}</span></div>
                <div className="text-sm text-gray-600">{s.start} {s.venue ? `@ ${s.venue}` : ""}</div>
                {s.description ? <p className="mt-2 text-sm">{s.description}</p> : null}
                {s.source_url ? <a className="text-sm underline" href={s.source_url} target="_blank">Source</a> : null}
              </div>
              <div className="flex gap-2">
                <button className="border px-3 py-1 rounded" onClick={() => approve(s.id)}>Approve</button>
                <button className="border px-3 py-1 rounded" onClick={() => reject(s.id)}>Reject</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
