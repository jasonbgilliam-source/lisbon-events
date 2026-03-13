"use client";

import * as React from "react";

type DuplicateEvent = {
  id: string;
  title?: string | null;
  starts_at?: string | null;
  location_name?: string | null;
  slug?: string | null;
};

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
  source_url?: string | null;
  all_day?: boolean | null;
  age?: string | null;
  audience?: string[] | string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  created_at?: string | null;
  is_citywide?: boolean | null;
};

type DraftMap = Record<string, Submission>;
type SelectedMap = Record<string, boolean>;
type DuplicateMap = Record<string, DuplicateEvent[]>;
type DuplicateLoadingMap = Record<string, boolean>;

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
const CITYWIDE_LABEL = "Various locations around Lisbon";

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

function safeTrim(v?: string | null) {
  return String(v || "").trim();
}

function sourceLink(s: Submission) {
  return safeTrim(s.source_url) || safeTrim(s.ticket_url);
}

function domainFromUrl(url?: string | null) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function mapSearchLink(s: Submission) {
  const parts = [s.location_name || "", s.address || "", s.city || ""]
    .map((x) => safeTrim(x))
    .filter(Boolean);

  if (parts.length === 0) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(" "))}`;
}

function eventPublicLink(event: DuplicateEvent) {
  const slug = safeTrim(event.slug);
  if (slug) return `/events/${encodeURIComponent(slug)}`;

  const id = safeTrim(event.id);
  return id ? `/events/${encodeURIComponent(id)}` : "";
}

function readiness(d: Submission) {
  const citywide = !!d.is_citywide;

  return {
    title: !!safeTrim(d.title),
    starts_at: !!safeTrim(d.starts_at),
    category: !!safeTrim(d.category),
    location_name: citywide ? true : !!safeTrim(d.location_name),
    address: citywide ? true : !!safeTrim(d.address),
    city: !!safeTrim(d.city),
    source_url: !!safeTrim(d.source_url),
  };
}

function readinessCount(d: Submission) {
  const r = readiness(d);
  return Object.values(r).filter(Boolean).length;
}

function normalizeForCompare(v?: string | null) {
  return safeTrim(v).toLowerCase();
}

function duplicateSignature(d: Submission) {
  return [
    normalizeForCompare(d.title),
    safeTrim(fromInputDateTime(d.starts_at) || d.starts_at),
    normalizeForCompare(d.is_citywide ? CITYWIDE_LABEL : d.location_name),
  ].join("||");
}

function RowBadge({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs",
        ok
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      {label} {ok ? "✓" : "•"}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={["w-full rounded-lg border px-3 py-2 text-sm", props.className || ""].join(" ")}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={["w-full rounded-lg border px-3 py-2 text-sm", props.className || ""].join(" ")}
    />
  );
}

export default function SubmissionsAdminPage() {
  const [subs, setSubs] = React.useState<Submission[]>([]);
  const [drafts, setDrafts] = React.useState<DraftMap>({});
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [selected, setSelected] = React.useState<SelectedMap>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [bulkWorking, setBulkWorking] = React.useState(false);
  const [duplicateMap, setDuplicateMap] = React.useState<DuplicateMap>({});
  const [duplicateLoading, setDuplicateLoading] = React.useState<DuplicateLoadingMap>({});
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
          is_citywide: false,
        };
        nextSelected[s.id] = false;
        nextExpanded[s.id] = false;
      }

      setDrafts(nextDrafts);
      setSelected(nextSelected);
      setExpanded(nextExpanded);
      setDuplicateMap({});
      setDuplicateLoading({});
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

    if (!res.ok) {
      const err: any = new Error(j.error || res.statusText);
      err.status = res.status;
      err.payload = j;
      throw err;
    }

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

  function resetDraft(id: string) {
    const original = subs.find((s) => s.id === id);
    if (!original) return;

    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...original,
        starts_at: toInputDateTime(original.starts_at),
        ends_at: toInputDateTime(original.ends_at),
        audience: audienceToString(original.audience),
        is_citywide: false,
      },
    }));

    setDuplicateMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function setCitywide(id: string, checked: boolean) {
    setDrafts((prev) => {
      const current = prev[id];
      if (!current) return prev;

      const next: Submission = {
        ...current,
        is_citywide: checked,
      };

      if (checked) {
        if (!safeTrim(next.location_name)) next.location_name = CITYWIDE_LABEL;
        if (!safeTrim(next.city)) next.city = "Lisbon";
        next.address = "";
      }

      return {
        ...prev,
        [id]: next,
      };
    });
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
      source_url: d.source_url ?? "",
      all_day: Boolean(d.all_day),
      age: d.age ?? "",
      audience: typeof d.audience === "string" ? d.audience : audienceToString(d.audience),
      youtube_url: d.youtube_url ?? "",
      spotify_url: d.spotify_url ?? "",
      is_citywide: Boolean(d.is_citywide),
    };
  }

  async function checkDuplicates(id: string) {
    const d = drafts[id];
    if (!d) return;

    const r = readiness(d);
    const title = safeTrim(d.title);
    const startsAt = safeTrim(fromInputDateTime(d.starts_at) || d.starts_at);
    const locationName = safeTrim(d.is_citywide ? CITYWIDE_LABEL : d.location_name);

    if (!title || !startsAt || !locationName || !r.category || !r.city) {
      setDuplicateMap((prev) => ({ ...prev, [id]: [] }));
      return;
    }

    setDuplicateLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const params = new URLSearchParams();
      params.set("select", "id,title,starts_at,location_name,slug");
      params.set("title", `eq.${title}`);
      params.set("starts_at", `eq.${startsAt}`);
      params.set("location_name", `eq.${locationName}`);
      params.set("limit", "5");

      const res = await fetch(`/api/events/list?${params.toString()}`, {
        cache: "no-store",
        credentials: "same-origin",
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        setDuplicateMap((prev) => ({ ...prev, [id]: [] }));
        return;
      }

      const j = await res.json();
      const items = Array.isArray(j.items) ? j.items : [];
      setDuplicateMap((prev) => ({ ...prev, [id]: items }));
    } catch {
      setDuplicateMap((prev) => ({ ...prev, [id]: [] }));
    } finally {
      setDuplicateLoading((prev) => ({ ...prev, [id]: false }));
    }
  }

  React.useEffect(() => {
    const timers: number[] = [];

    for (const s of subs) {
      const d = drafts[s.id];
      if (!d) continue;

      const sig = duplicateSignature(d);
      const timer = window.setTimeout(() => {
        void checkDuplicates(s.id);
      }, 250);

      timers.push(timer);

      void sig;
    }

    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [subs, drafts]);

  async function approveOne(id: string) {
    const overrides = buildOverrides(id);
    if (!overrides) throw new Error("Missing draft values");

    const r = readiness(drafts[id]);
    if (!r.title || !r.starts_at || !r.category || !r.city || !r.source_url) {
      throw new Error(
        "Missing required fields: title, date/time, category, city, and source URL are required."
      );
    }

    if (!drafts[id]?.is_citywide && (!r.location_name || !r.address)) {
      throw new Error(
        "Missing required fields: venue/location name and address are required unless the event is marked citywide."
      );
    }

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

  function duplicateSummaryMessage(duplicates: DuplicateEvent[]) {
    if (!duplicates.length) {
      return "This event appears to already exist in the published events list.";
    }

    const lines = duplicates.slice(0, 5).map((dup) => {
      const title = safeTrim(dup.title) || "(untitled)";
      const date = formatShortDate(dup.starts_at);
      const venue = safeTrim(dup.location_name) || "(no venue)";
      return `${title} — ${date} — ${venue}`;
    });

    return [
      "This event appears to already exist in the published events list.",
      "",
      ...lines,
    ].join("\n");
  }

  async function approve(id: string) {
    const originalSubs = subs;
    setSubs((prev) => prev.filter((s) => s.id !== id));

    try {
      await approveOne(id);
      alert("Approved + published");
    } catch (e: any) {
      setSubs(originalSubs);

      if (e?.status === 409 && e?.payload?.code === "duplicate_event") {
        const duplicates: DuplicateEvent[] = Array.isArray(e?.payload?.duplicates)
          ? e.payload.duplicates
          : [];
        setDuplicateMap((prev) => ({ ...prev, [id]: duplicates }));
        alert(duplicateSummaryMessage(duplicates));
      } else {
        alert(`Approve failed: ${e.message || e}`);
      }

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
        if (e?.status === 409 && e?.payload?.code === "duplicate_event") {
          const duplicates: DuplicateEvent[] = Array.isArray(e?.payload?.duplicates)
            ? e.payload.duplicates
            : [];
          setDuplicateMap((prev) => ({ ...prev, [id]: duplicates }));
        }

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
    <main className="p-6 max-w-7xl mx-auto">
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
          const r = readiness(d);
          const readyCount = readinessCount(d);
          const src = sourceLink(d);
          const domain = domainFromUrl(src);
          const mapLink = mapSearchLink(d);
          const duplicates = duplicateMap[s.id] || [];
          const isCheckingDuplicates = !!duplicateLoading[s.id];

          return (
            <li key={s.id} className="border rounded-xl p-4 bg-white shadow-sm">
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
                      <div className="shrink-0">
                        {d.image_url ? (
                          <a href={d.image_url} target="_blank" rel="noreferrer">
                            <img
                              src={d.image_url}
                              alt={d.title || "submission image"}
                              className="w-28 h-28 object-cover rounded border bg-gray-100"
                            />
                          </a>
                        ) : (
                          <div className="w-28 h-28 rounded border bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <div className="text-lg font-semibold">
                              {safeTrim(d.title) || "(no title)"}
                              <span className="ml-2 text-xs text-gray-500 font-normal">
                                #{s.id}
                              </span>
                            </div>

                            <div className="mt-1 text-sm text-gray-600">
                              {formatShortDate(fromInputDateTime(d.starts_at) || d.starts_at) ||
                                "Missing date"}
                              {safeTrim(d.location_name) ? ` @ ${safeTrim(d.location_name)}` : ""}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <RowBadge ok={r.title} label="Title" />
                              <RowBadge ok={r.starts_at} label="Date" />
                              <RowBadge ok={r.category} label="Category" />
                              <RowBadge
                                ok={r.location_name}
                                label={d.is_citywide ? "Citywide" : "Venue"}
                              />
                              <RowBadge
                                ok={r.address}
                                label={d.is_citywide ? "Address excused" : "Address"}
                              />
                              <RowBadge ok={r.city} label="City" />
                              <RowBadge ok={r.source_url} label="Source" />
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs border-gray-200 bg-gray-50 text-gray-700">
                                Ready {readyCount}/7
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            <button
                              className="border px-3 py-1.5 rounded"
                              onClick={() => toggleExpanded(s.id)}
                            >
                              {isOpen ? "Hide details" : "Edit details"}
                            </button>
                            <button
                              className="border px-3 py-1.5 rounded hover:bg-green-50"
                              onClick={() => approve(s.id)}
                            >
                              Approve
                            </button>
                            <button
                              className="border px-3 py-1.5 rounded hover:bg-red-50"
                              onClick={() => reject(s.id)}
                            >
                              Reject
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Category
                            </div>
                            <div className="mt-1">
                              {safeTrim(d.category) || (
                                <span className="text-red-700">Missing category</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Address
                            </div>
                            <div className="mt-1">
                              {d.is_citywide ? (
                                <span className="text-gray-600 italic">
                                  Citywide event — precise address not required
                                </span>
                              ) : safeTrim(d.address) ? (
                                safeTrim(d.address)
                              ) : (
                                <span className="text-red-700">Missing address</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              City
                            </div>
                            <div className="mt-1">
                              {safeTrim(d.city) || <span className="text-red-700">Missing city</span>}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Source
                            </div>
                            <div className="mt-1 break-all">
                              {src ? (
                                <a
                                  href={src}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline"
                                >
                                  {src}
                                </a>
                              ) : (
                                <span className="text-red-700">Missing source URL</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 rounded-lg border p-3 text-sm">
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Exact duplicate check
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Checks whether an event with the same title, date, and venue already
                            exists in the published events list.
                          </div>

                          {isCheckingDuplicates ? (
                            <div className="mt-2 text-gray-600">Checking for duplicates…</div>
                          ) : duplicates.length > 0 ? (
                            <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-3">
                              <div className="font-medium text-amber-900">
                                Exact duplicate found in published events
                              </div>
                              <div className="mt-2 space-y-2">
                                {duplicates.map((dup) => {
                                  const href = eventPublicLink(dup);
                                  return (
                                    <div
                                      key={dup.id}
                                      className="rounded border border-amber-200 bg-white p-2"
                                    >
                                      <div className="font-medium text-gray-900">
                                        {safeTrim(dup.title) || "(untitled event)"}
                                      </div>
                                      <div className="text-gray-700">
                                        {formatShortDate(dup.starts_at)}{" "}
                                        {safeTrim(dup.location_name)
                                          ? `— ${safeTrim(dup.location_name)}`
                                          : ""}
                                      </div>
                                      <div className="mt-1 flex gap-3 flex-wrap">
                                        {dup.id ? (
                                          <a
                                            href={`/admin/events/${encodeURIComponent(String(dup.id))}`}
                                            className="underline text-sm"
                                          >
                                            Edit existing event
                                          </a>
                                        ) : null}
                                        {href ? (
                                          <a
                                            href={href}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline text-sm"
                                          >
                                            View public page
                                          </a>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 text-green-700">No exact duplicate found.</div>
                          )}
                        </div>

                        <div className="mt-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Description
                          </div>
                          <div className="mt-1 text-sm whitespace-pre-wrap text-gray-800">
                            {safeTrim(d.description) || (
                              <span className="text-gray-500 italic">No description</span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {src ? (
                            <a
                              href={src}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded border bg-gray-50 px-3 py-1.5 text-sm hover:bg-gray-100"
                            >
                              🔗 View source {domain ? `(${domain})` : ""}
                            </a>
                          ) : null}

                          {mapLink ? (
                            <a
                              href={mapLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded border bg-gray-50 px-3 py-1.5 text-sm hover:bg-gray-100"
                            >
                              📍 Open in Google Maps
                            </a>
                          ) : null}

                          {safeTrim(d.image_url) ? (
                            <a
                              href={String(d.image_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded border bg-gray-50 px-3 py-1.5 text-sm hover:bg-gray-100"
                            >
                              🖼 Open image
                            </a>
                          ) : null}

                          <button
                            className="inline-flex items-center gap-1 rounded border bg-gray-50 px-3 py-1.5 text-sm hover:bg-gray-100"
                            onClick={() => resetDraft(s.id)}
                            type="button"
                          >
                            Reset changes
                          </button>
                        </div>

                        {isOpen ? (
                          <div className="mt-5 border-t pt-4">
                            <div className="mb-4 rounded-lg border bg-amber-50 p-3 text-sm text-amber-900">
                              <label className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={!!d.is_citywide}
                                  onChange={(e) => setCitywide(s.id, e.target.checked)}
                                  className="mt-0.5"
                                />
                                <span>
                                  <strong>Citywide / multiple locations</strong>
                                  <span className="block text-amber-800 mt-1">
                                    Use this for events that happen across Lisbon or at multiple
                                    venues. When checked, precise street address is excused and the
                                    event will use a Lisbon-wide fallback location.
                                  </span>
                                </span>
                              </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <FieldLabel>Title</FieldLabel>
                                <TextInput
                                  value={d.title ?? ""}
                                  onChange={(e) => updateDraft(s.id, { title: e.target.value })}
                                />
                              </div>

                              <div>
                                <FieldLabel>Category</FieldLabel>
                                <select
                                  value={d.category ?? ""}
                                  onChange={(e) => updateDraft(s.id, { category: e.target.value })}
                                  className="w-full rounded-lg border px-3 py-2 text-sm"
                                >
                                  <option value="">Select category</option>
                                  {CATEGORY_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <FieldLabel>Starts at</FieldLabel>
                                <TextInput
                                  type="datetime-local"
                                  value={d.starts_at ?? ""}
                                  onChange={(e) => updateDraft(s.id, { starts_at: e.target.value })}
                                />
                              </div>

                              <div>
                                <FieldLabel>Ends at</FieldLabel>
                                <TextInput
                                  type="datetime-local"
                                  value={d.ends_at ?? ""}
                                  onChange={(e) => updateDraft(s.id, { ends_at: e.target.value })}
                                />
                              </div>

                              <div>
                                <FieldLabel>Venue / location name</FieldLabel>
                                <TextInput
                                  value={d.location_name ?? ""}
                                  onChange={(e) =>
                                    updateDraft(s.id, { location_name: e.target.value })
                                  }
                                  placeholder={d.is_citywide ? CITYWIDE_LABEL : "e.g. LX Factory"}
                                />
                              </div>

                              <div>
                                <FieldLabel>City</FieldLabel>
                                <TextInput
                                  value={d.city ?? ""}
                                  onChange={(e) => updateDraft(s.id, { city: e.target.value })}
                                  placeholder="e.g. Lisbon"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <FieldLabel>Address</FieldLabel>
                                <TextInput
                                  value={d.address ?? ""}
                                  onChange={(e) => updateDraft(s.id, { address: e.target.value })}
                                  placeholder={
                                    d.is_citywide
                                      ? "Not required for citywide events"
                                      : "Street address"
                                  }
                                  disabled={!!d.is_citywide}
                                />
                              </div>

                              <div className="md:col-span-2">
                                <FieldLabel>Description</FieldLabel>
                                <TextArea
                                  rows={5}
                                  value={d.description ?? ""}
                                  onChange={(e) =>
                                    updateDraft(s.id, { description: e.target.value })
                                  }
                                />
                              </div>

                              <div className="md:col-span-2">
                                <FieldLabel>Image URL</FieldLabel>
                                <TextInput
                                  value={d.image_url ?? ""}
                                  onChange={(e) => updateDraft(s.id, { image_url: e.target.value })}
                                  placeholder="https://..."
                                />
                              </div>

                              <div className="md:col-span-2">
                                <FieldLabel>Source URL</FieldLabel>
                                <TextInput
                                  value={d.source_url ?? ""}
                                  onChange={(e) =>
                                    updateDraft(s.id, { source_url: e.target.value })
                                  }
                                  placeholder="https://..."
                                />
                              </div>

                              <div className="md:col-span-2">
                                <FieldLabel>Ticket URL</FieldLabel>
                                <TextInput
                                  value={d.ticket_url ?? ""}
                                  onChange={(e) =>
                                    updateDraft(s.id, { ticket_url: e.target.value })
                                  }
                                  placeholder="https://..."
                                />
                              </div>

                              <div>
                                <FieldLabel>Organizer email</FieldLabel>
                                <TextInput
                                  value={d.organizer_email ?? ""}
                                  onChange={(e) =>
                                    updateDraft(s.id, { organizer_email: e.target.value })
                                  }
                                />
                              </div>

                              <div>
                                <FieldLabel>Age</FieldLabel>
                                <TextInput
                                  value={d.age ?? ""}
                                  onChange={(e) => updateDraft(s.id, { age: e.target.value })}
                                  placeholder="e.g. All Ages"
                                />
                              </div>

                              <div>
                                <FieldLabel>Audience</FieldLabel>
                                <TextInput
                                  value={
                                    typeof d.audience === "string"
                                      ? d.audience
                                      : audienceToString(d.audience)
                                  }
                                  onChange={(e) => updateDraft(s.id, { audience: e.target.value })}
                                  placeholder="All Ages, Family, Adults"
                                />
                              </div>

                              <div>
                                <FieldLabel>All day</FieldLabel>
                                <label className="flex items-center gap-2 text-sm pt-2">
                                  <input
                                    type="checkbox"
                                    checked={!!d.all_day}
                                    onChange={(e) =>
                                      updateDraft(s.id, { all_day: e.target.checked })
                                    }
                                  />
                                  <span>Event lasts all day</span>
                                </label>
                              </div>

                              <div>
                                <FieldLabel>YouTube URL</FieldLabel>
                                <TextInput
                                  value={d.youtube_url ?? ""}
                                  onChange={(e) =>
                                    updateDraft(s.id, { youtube_url: e.target.value })
                                  }
                                />
                              </div>

                              <div>
                                <FieldLabel>Spotify URL</FieldLabel>
                                <TextInput
                                  value={d.spotify_url ?? ""}
                                  onChange={(e) =>
                                    updateDraft(s.id, { spotify_url: e.target.value })
                                  }
                                />
                              </div>
                            </div>

                            <div className="mt-4 rounded-lg border bg-gray-50 p-3 text-sm text-gray-700">
                              On approval, the system will use these edited values, normalize
                              date/time, and either geocode the venue/address/city or use a
                              Lisbon-wide fallback location for citywide events.
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
