"use client";

import * as React from "react";
import { adminGetJSON, adminPostJSON } from "@/lib/adminFetch";

type Submission = {
  id: number;
  status?: string;

  title?: string;
  description?: string;

  start?: string;
  end?: string;
  venue?: string;

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
  image_url?: string;

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

function domainFromUrl(url?: string) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function mapSearchLink(s: Submission) {
  const parts = [
    s.location_name || s.venue || "",
    s.address || "",
    s.city || "",
  ].filter(Boolean);

  if (parts.length === 0) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(" "))}`;
}

export default function SubmissionsAdminPage() {
  const [subs, setSubs] = React.useState<Submission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetJSON<{ items: Submission[] }>(
        "/api/admin/submissions/list"
      );
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

  if (error) {
    return (
      <main className="p-6">
        <p className="text-red-700 font-medium">Error: {error}</p>
        <p className="text-sm mt-2">
          Tip: open <code>/api/admin/submissions/list</code> directly in your
          browser. If that shows 401, your admin token env vars aren’t set.
        </p>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">
        Pending Event Submissions
      </h1>

      {subs.length === 0 ? <p>No pending submissions 🎉</p> : null}

      <ul className="space-y-5">
        {subs.map((s) => {
          const src = sourceLink(s);
          const domain = domainFromUrl(src);
          const mapLink = mapSearchLink(s);

          return (
            <li key={s.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                {s.image_url ? (
                  <a
                    href={s.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <img
                      src={s.image_url}
                      alt={s.title || "submission image"}
                      className="h-32 w-32 rounded-lg border object-cover bg-gray-100"
                    />
                  </a>
                ) : (
                  <div className="h-32 w-32 shrink-0 rounded-lg border bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                    No image
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {s.title || "(no title)"}{" "}
                        <span className="text-xs font-normal text-gray-500">
                          #{s.id}
                        </span>
                      </div>

                      {s.category ? (
                        <div className="mt-1 inline-flex rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium text-[#c94917]">
                          {s.category}
                        </div>
                      ) : (
                        <div className="mt-1 inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                          No category
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        className="rounded border px-3 py-1.5 hover:bg-green-50"
                        onClick={() => approve(s.id)}
                      >
                        Approve
                      </button>
                      <button
                        className="rounded border px-3 py-1.5 hover:bg-red-50"
                        onClick={() => reject(s.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Date / Time
                      </div>
                      <div className="mt-1 text-gray-800">
                        {whenText(s) || <span className="text-red-700">Missing date</span>}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Venue
                      </div>
                      <div className="mt-1 text-gray-800">
                        {whereText(s) || <span className="text-red-700">Missing venue</span>}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Address
                      </div>
                      <div className="mt-1 text-gray-800">
                        {s.address || <span className="text-red-700">Missing address</span>}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        City
                      </div>
                      <div className="mt-1 text-gray-800">
                        {s.city || <span className="text-red-700">Missing city</span>}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Ticket URL
                      </div>
                      <div className="mt-1 text-gray-800 break-all">
                        {s.ticket_url ? (
                          <a
                            href={s.ticket_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {s.ticket_url}
                          </a>
                        ) : (
                          <span className="text-gray-500">None</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Source URL
                      </div>
                      <div className="mt-1 text-gray-800 break-all">
                        {src ? (
                          <a
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {src}
                          </a>
                        ) : (
                          <span className="text-red-700">Missing source</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Description
                    </div>
                    <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
                      {s.description || <span className="text-gray-500 italic">No description</span>}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {src ? (
                      <a
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded border bg-gray-50 px-3 py-1.5 text-sm hover:bg-gray-100"
                      >
                        🔗 View source {domain ? `(${domain})` : ""}
                      </a>
                    ) : null}

                    {mapLink ? (
                      <a
                        href={mapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded border bg-gray-50 px-3 py-1.5 text-sm hover:bg-gray-100"
                      >
                        📍 Open in Google Maps
                      </a>
                    ) : null}

                    {s.image_url ? (
                      <a
                        href={s.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded border bg-gray-50 px-3 py-1.5 text-sm hover:bg-gray-100"
                      >
                        🖼 Open image
                      </a>
                    ) : null}
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
