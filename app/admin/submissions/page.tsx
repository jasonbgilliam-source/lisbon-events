
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
  audience?: string[] | string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  created_at?: string | null;
};

type DraftMap = Record<string, Submission>;
type SelectedMap = Record<string, boolean>;

type BulkProgress = {
  mode: "approve" | "reject" | null;
  total: number;
  done: number;
  success: number;
  failed: number;
  active: boolean;
};

const CATEGORY_OPTIONS = [
  "Arts",
  "Cinema",
  "Comedy",
  "Dance",
  "Exhibition",
  "Festival",
  "Food & Drink",
  "Lecture",
  "Market",
  "Music",
  "Nightlife",
  "Outdoor",
  "Sports",
  "Theater",
  "Workshop",
];

const CSRF_HEADER_NAME = "x-le-csrf";
const CSRF_HEADER_VALUE = "1";

function audienceToString(audience: Submission["audience"]) {
  if (Array.isArray(audience)) return audience.join(", ");
  if (typeof audience === "string") return audience;
  return "";
}

function toInputDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromInputDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function formatShortDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function SubmissionsAdminPage() {
  const [subs, setSubs] = React.useState<Submission[]>([]);
  const [drafts, setDrafts] = React.useState<DraftMap>({});
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [selected, setSelected] = React.useState<SelectedMap>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [bulkWorking, setBulkWorking] = React.useState(false);
  const [bulkProgress, setBulkProgress] = React.useState<BulkProgress>({
    mode: null,
    total: 0,
    done: 0,
    success: 0,
    failed: 0,
    active: false,
  });

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/submissions/list", {
        cache: "no-store",
        credentials: "same-origin",
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const t = await res.text();
        throw new Error(
          `Expected JSON from /api/admin/submissions/list, got ${res.status}. First bytes: ${t.slice(0, 120)}`
        );
      }

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);

      const items = j.items || [];
      setSubs(items);

      const nextDrafts: DraftMap = {};
      const nextSelected: SelectedMap = {};
      const nextExpanded: Record<string, boolean> = {};

      for (const s of items) {
        nextDrafts[s.id] = {
          ...s,
          starts_at: toInputDateTime(s.starts_at),
          ends_at: toInputDateTime(s.ends_at),
          audience: audienceToString(s.audience),
        };
        nextSelected[s.id] = false;
        nextExpanded[s.id] = false;
      }

      setDrafts(nextDrafts);
      setSelected(nextSelected);
      setExpanded(nextExpanded);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function postJSON(url: string, body: any) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
    });

    const ct = res.headers.get("content-type") || "";
    const j = ct.includes("application/json") ? await res.json() : {};
    if (!res.ok) throw new Error(j.error || res.statusText);
    return j;
  }

  function updateDraft(id: string, patch: Partial<Submission>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function toggleSelected(id: string) {
    setSelected((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function selectAllVisible() {
    const next: SelectedMap = {};
    for (const s of subs) next[s.id] = true;
    setSelected(next);
  }

  function clearSelection() {
    const next: SelectedMap = {};
    for (const s of subs) next[s.id] = false;
    setSelected(next);
  }

  function selectedIds() {
    return subs.filter((s) => selected[s.id]).map((s) => s.id);
  }

  function buildOverrides(id: string) {
    const d = drafts[id];
    if (!d) return null;

    return {
      title: d.title ?? "",
      description: d.description ?? "",
      starts_at: fromInputDateTime(d.starts_at),
      ends_at: fromInputDateTime(d.ends_at),
      location_name: d.location_name ?? "",
      city: d.city ?? "",
      address: d.address ?? "",
      category: d.category ?? "",
      organizer_email: d.organizer_email ?? "",
      image_url: d.image_url ?? "",
      ticket_url: d.ticket_url ?? "",
      all_day: Boolean(d.all_day),
      age: d.age ?? "",
      audience: typeof d.audience === "string" ? d.audience : audienceToString(d.audience),
      youtube_url: d.youtube_url ?? "",
      spotify_url: d.spotify_url ?? "",
    };
  }

  async function approveOne(id: string) {
    const overrides = buildOverrides(id);
    if (!overrides) throw new Error("Missing draft values");

    await postJSON("/api/admin/submissions/approve", {
      id,
      reviewer: "admin",
      notes: "",
      overrides,
    });
  }

  async function rejectOne(id: string, notes = "") {
    await postJSON("/api/admin/submissions/reject", {
      id,
      reviewer: "admin",
      notes,
    });
  }

  async function approve(id: string) {
    const originalSubs = subs;
    setSubs((prev) => prev.filter((s) => s.id !== id));

    try {
      await approveOne(id);
      alert("Approved + published");
    } catch (e: any) {
      setSubs(originalSubs);
      alert(`Approve failed: ${e.message || e}`);
      load();
    }
  }

  async function reject(id: string) {
    const notes = prompt("Optional note for rejection") || "";
    const originalSubs = subs;
    setSubs((prev) => prev.filter((s) => s.id !== id));

    try {
      await rejectOne(id, notes);
      alert("Rejected");
    } catch (e: any) {
      setSubs(originalSubs);
      alert(`Reject failed: ${e.message || e}`);
      load();
    }
  }

  async function approveSelected() {
    const ids = selectedIds();
    if (ids.length === 0) {
      alert("No submissions selected.");
      return;
    }

    if (!confirm(`Approve ${ids.length} selected submission(s)?`)) return;

    setBulkWorking(true);
    setBulkProgress({
      mode: "approve",
      total: ids.length,
      done: 0,
      success: 0,
      failed: 0,
      active: true,
    });

    const successes: string[] = [];
    const failures: { id: string; error: string }[] = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        await approveOne(id);
        successes.push(id);
        setBulkProgress((prev) => ({
          ...prev,
          done: i + 1,
          success: prev.success + 1,
        }));
      } catch (e: any) {
        failures.push({ id, error: e?.message || String(e) });
        setBulkProgress((prev) => ({
          ...prev,
          done: i + 1,
          failed: prev.failed + 1,
        }));
      }
    }

    setBulkWorking(false);
    setBulkProgress((prev) => ({ ...prev, active: false }));

    if (successes.length) {
      setSubs((prev) => prev.filter((s) => !successes.includes(s.id)));
    }

    if (failures.length) {
      alert(
        `Approved ${successes.length} item(s), ${failures.length} failed.\n\n` +
          failures.map((f) => `#${f.id.slice(0, 8)}: ${f.error}`).join("\n")
      );
      load();
      return;
    }

    alert(`Approved ${successes.length} submission(s).`);
  }

  async function rejectSelected() {
    const ids = selectedIds();
    if (ids.length === 0) {
      alert("No submissions selected.");
      return;
    }

    const notes = prompt("Optional note for rejection of selected items") || "";
    if (!confirm(`Reject ${ids.length} selected submission(s)?`)) return;

    setBulkWorking(true);
    setBulkProgress({
      mode: "reject",
      total: ids.length,
      done: 0,
      success: 0,
      failed: 0,
      active: true,
    });

    const successes: string[] = [];
    const failures: { id: string; error: string }[] = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        await rejectOne(id, notes);
        successes.push(id);
        setBulkProgress((prev) => ({
          ...prev,
          done: i + 1,
          success: prev.success + 1,
        }));
      } catch (e: any) {
        failures.push({ id, error: e?.message || String(e) });
        setBulkProgress((prev) => ({
          ...prev,
          done: i + 1,
          failed: prev.failed + 1,
        }));
      }
    }

    setBulkWorking(false);
    setBulkProgress((prev) => ({ ...prev, active: false }));

    if (successes.length) {
      setSubs((prev) => prev.filter((s) => !successes.includes(s.id)));
    }

    if (failures.length) {
      alert(
        `Rejected ${successes.length} item(s), ${failures.length} failed.\n\n` +
          failures.map((f) => `#${f.id.slice(0, 8)}: ${f.error}`).join("\n")
      );
      load();
      return;
    }

    alert(`Rejected ${successes.length} submission(s).`);
  }

  const selectedCount = selectedIds().length;

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">Pending Event Submissions</h1>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="border px-3 py-1 rounded"
            onClick={load}
            disabled={loading || bulkWorking}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>

          <button
            className="border px-3 py-1 rounded"
            onClick={selectAllVisible}
            disabled={loading || bulkWorking || subs.length === 0}
          >
            Select all visible
          </button>

          <button
            className="border px-3 py-1 rounded"
            onClick={clearSelection}
            disabled={loading || bulkWorking || subs.length === 0}
          >
            Clear selection
          </button>

          <button
            className="border px-3 py-1 rounded"
            onClick={approveSelected}
            disabled={loading || bulkWorking || selectedCount === 0}
          >
            {bulkWorking && bulkProgress.mode === "approve"
              ? "Approving…"
              : `Approve selected (${selectedCount})`}
          </button>

          <button
            className="border px-3 py-1 rounded"
            onClick={rejectSelected}
            disabled={loading || bulkWorking || selectedCount === 0}
          >
            {bulkWorking && bulkProgress.mode === "reject"
              ? "Rejecting…"
              : `Reject selected (${selectedCount})`}
          </button>
        </div>
      </div>

      {bulkProgress.active ? (
        <div className="mb-4 border rounded p-3 bg-gray-50">
          <div className="font-medium">
            {bulkProgress.mode === "approve" ? "Bulk approve" : "Bulk reject"} in progress
          </div>
          <div className="text-sm text-gray-700 mt-1">
            Processing {bulkProgress.done} / {bulkProgress.total}
          </div>
          <div className="text-sm text-gray-700">
            Success: {bulkProgress.success} • Failed: {bulkProgress.failed}
          </div>
        </div>
      ) : null}

      {error && <p className="text-red-700 mb-3">Error: {error}</p>}
      {!error && loading && <p>Loading…</p>}
      {!loading && subs.length === 0 && <p>No pending submissions 🎉</p>}

      <ul className="space-y-4">
        {subs.map((s) => {
          const d = drafts[s.id] || s;
          const isOpen = !!expanded[s.id];

          return (
            <li key={s.id} className="border rounded p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-3 min-w-0 flex-1">
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={!!selected[s.id]}
                      onChange={() => toggleSelected(s.id)}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex gap-4 items-start flex-wrap">
                      {d.image_url ? (
                        <a
                          href={d.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0"
                        >
                          <img
                            src={d.image_url}
                            alt={d.title || "submission image"}
                            className="w-24 h-24 object-cover rounded border bg-gray-100"
                          />
                        </a>
                      ) : null}

                      <div className="min-w-0 flex-1">
                        <div className="font-medium">
                          {d.title || "(no title)"}{" "}
                          <span className="text-xs text-gray-500">#{s.id.slice(0, 8)}</span>
                        </div>

                        <div className="text-sm text-gray-600 mt-1">
                          {formatShortDate(d.starts_at)}
                          {d.location_name ? ` @ ${d.location_name}` : ""}
                        </div>

                        <div className="text-sm text-gray-600">
                          {d.category ? `Category: ${d.category}` : ""}
                          {d.city ? ` • City: ${d.city}` : ""}
                        </div>

                        {d.address ? (
                          <div className="text-sm text-gray-600 break-words">
                            Address: {d.address}
                          </div>
                        ) : null}

                        <div className="mt-2 flex flex-wrap gap-3">
                          <button
                            className="border px-3 py-1 rounded text-sm"
                            onClick={() => toggleExpanded(s.id)}
                          >
                            {isOpen ? "Hide editor" : "Edit before approval"}
                          </button>

                          {d.ticket_url ? (
                            <a
                              className="text-sm underline"
                              href={d.ticket_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Tickets
                            </a>
                          ) : null}

                          {d.image_url ? (
                            <a
                              className="text-sm underline"
                              href={d.image_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Image
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {isOpen ? (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="block">
                          <div className="text-sm mb-1">Title</div>
                          <input
                            className="w-full border rounded px-3 py-2"
                            value={d.title ?? ""}
                            onChange={(e) => updateDraft(s.id, { title: e.target.value })}
                          />
                        </label>

                        <label className="block">
                          <div className="text-sm mb-1">Category</div>
                          <select
                            className="w-full border rounded px-3 py-2"
                            value={d.category ?? ""}
                            onChange={(e) => updateDraft(s.id, { category: e.target.value })}
                          >
                            <option value="">Select category</option>
                            {CATEGORY_OPTIONS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <div className="text-sm mb-1">Start</div>
                          <input
                            type="datetime-local"
                            className="w-full border rounded px-3 py-2"
                            value={d.starts_at ?? ""}
                            onChange={(e) => updateDraft(s.id, { starts_at: e.target.value })}
                          />
                        </label>

                        <label className="block">
                          <div className="text-sm mb-1">End</div>
                          <input
                            type="datetime-local"
                            className="w-full border rounded px-3 py-2"
                            value={d.ends_at ?? ""}
                            onChange={(e) => updateDraft(s.id, { ends_at: e.target.value })}
                          />
                        </label>

                        <label className="block">
                          <div className="text-sm mb-1">Location</div>
                          <input
                            className="w-full border rounded px-3 py-2"
                            value={d.location_name ?? ""}
                            onChange={(e) =>
                              updateDraft(s.id, { location_name: e.target.value })
                            }
                          />
                        </label>

                        <label className="block">
                          <div className="text-sm mb-1">City</div>
                          <input
                            className="w-full border rounded px-3 py-2"
                            value={d.city ?? ""}
                            onChange={(e) => updateDraft(s.id, { city: e.target.value })}
                          />
                        </label>

                        <label className="block md:col-span-2">
                          <div className="text-sm mb-1">Address</div>
                          <input
                            className="w-full border rounded px-3 py-2"
                            value={d.address ?? ""}
                            onChange={(e) => updateDraft(s.id, { address: e.target.value })}
                          />
                        </label>

                        <label className="block md:col-span-2">
                          <div className="text-sm mb-1">Description</div>
                          <textarea
                            className="w-full border rounded px-3 py-2 min-h-28"
                            value={d.description ?? ""}
                            onChange={(e) =>
                              updateDraft(s.id, { description: e.target.value })
                            }
                          />
                        </label>

                        <label className="block">
                          <div className="text-sm mb-1">Ticket URL</div>
                          <input
                            className="w-full border rounded px-3 py-2"
                            value={d.ticket_url ?? ""}
                            onChange={(e) => updateDraft(s.id, { ticket_url: e.target.value })}
                          />
                        </label>

                        <label className="block">
                          <div className="text-sm mb-1">Image URL</div>
                          <input
                            className="w-full border rounded px-3 py-2"
                            value={d.image_url ?? ""}
                            onChange={(e) => updateDraft(s.id, { image_url: e.target.value })}
                          />
                        </label>

                        <label className="block">
                          <div className="text-sm mb-1">Organizer Email</div>
                          <input
                            className="w-full border rounded px-3 py-2"
                            value={d.organizer_email ?? ""}
                            onChange={(e) =>
                              updateDraft(s.id, { organizer_email: e.target.value })
                            }
                          />
                        </label>

                        <label className="block">
                          <div className="text-sm mb-1">Audience</div>
                          <input
                            className="w-full border rounded px-3 py-2"
                            value={
                              typeof d.audience === "string"
                                ? d.audience
                                : audienceToString(d.audience)
                            }
                            onChange={(e) => updateDraft(s.id, { audience: e.target.value })}
                            placeholder="All Ages, Family, Kids"
                          />
                        </label>

                        <label className="block">
                          <div className="text-sm mb-1">Age Notes</div>
                          <input
                            className="w-full border rounded px-3 py-2"
                            value={d.age ?? ""}
                            onChange={(e) => updateDraft(s.id, { age: e.target.value })}
                          />
                        </label>

                        <label className="block">
                          <div className="text-sm mb-1">YouTube URL</div>
                          <input
                            className="w-full border rounded px-3 py-2"
                            value={d.youtube_url ?? ""}
                            onChange={(e) => updateDraft(s.id, { youtube_url: e.target.value })}
                          />
                        </label>

                        <label className="block">
                          <div className="text-sm mb-1">Spotify URL</div>
                          <input
                            className="w-full border rounded px-3 py-2"
                            value={d.spotify_url ?? ""}
                            onChange={(e) => updateDraft(s.id, { spotify_url: e.target.value })}
                          />
                        </label>

                        <label className="flex items-center gap-2 mt-2">
                          <input
                            type="checkbox"
                            checked={Boolean(d.all_day)}
                            onChange={(e) => updateDraft(s.id, { all_day: e.target.checked })}
                          />
                          <span className="text-sm">All day</span>
                        </label>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    className="border px-3 py-1 rounded"
                    onClick={() => approve(s.id)}
                    disabled={bulkWorking}
                  >
                    Approve
                  </button>
                  <button
                    className="border px-3 py-1 rounded"
                    onClick={() => reject(s.id)}
                    disabled={bulkWorking}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
