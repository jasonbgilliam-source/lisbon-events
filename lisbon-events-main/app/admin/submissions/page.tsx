"use client";

import * as React from "react";

type Submission = {
  id: string;
  status: string | null;
  title?: string | null;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  location_name?: string | null;
  city?: string | null;
  address?: string | null;
  category?: string | null;
  organizer_email?: string | null;
  image_url?: string | null;
  ticket_url?: string | null;
  all_day?: boolean | null;
  age?: string | null;
  created_at?: string | null;
};

export default function SubmissionsAdminPage() {
  const [subs, setSubs] = React.useState<Submission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/submissions/list", { cache: "no-store" });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const t = await res.text();
        throw new Error(`Expected JSON from /api/submissions/list, got ${res.status}. First bytes: ${t.slice(0, 120)}`);
      }
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

  async function postJSON(url: string, body: any) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const ct = res.headers.get("content-type") || "";
    const j = ct.includes("application/json") ? await res.json() : {};
    if (!res.ok) throw new Error(j.error || res.statusText);
    return j;
  }

  async function approve(id: string) {
    // optimistic remove
    setSubs(prev => prev.filter(s => s.id !== id));
    try {
      await postJSON("/api/submissions/approve", { id, reviewer: "admin", notes: "" });
      // no reload needed—the optimistic removal already hid it
      alert("Approved + published");
    } catch (e: any) {
      alert(`Approve failed: ${e.message || e}`);
      // if failed, reload to resync
      load();
    }
  }

  async function reject(id: string) {
    const notes = prompt("Optional note for rejection") || "";
    // optimistic remove
    setSubs(prev => prev.filter(s => s.id !== id));
    try {
      await postJSON("/api/submissions/reject", { id, reviewer: "admin", notes });
      alert("Rejected");
    } catch (e: any) {
      alert(`Reject failed: ${e.message || e}`);
      load();
    }
  }

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Pending Event Submissions</h1>
        <button className="border px-3 py-1 rounded" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="text-red-700 mb-3">Error: {error}</p>}
      {!error && loading && <p>Loading…</p>}
      {!loading && subs.length === 0 && <p>No pending submissions 🎉</p>}

      <ul className="space-y-4">
        {subs.map(s => (
          <li key={s.id} className="border rounded p-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="font-medium">
                  {s.title || "(no title)"}{" "}
                  <span className="text-xs text-gray-500">#{s.id.slice(0, 8)}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {s.starts_at || ""} {s.location_name ? `@ ${s.location_name}` : ""}
                </div>
                {s.description ? <p className="mt-2 text-sm">{s.description}</p> : null}
                {s.ticket_url ? <a className="text-sm underline mr-3" href={s.ticket_url} target="_blank" rel="noreferrer">Tickets</a> : null}
                {s.image_url ? <a className="text-sm underline" href={s.image_url} target="_blank" rel="noreferrer">Image</a> : null}
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
