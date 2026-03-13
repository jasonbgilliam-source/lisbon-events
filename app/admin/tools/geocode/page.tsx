"use client";

import * as React from "react";

const CSRF_HEADER_NAME = "x-le-csrf";
const CSRF_HEADER_VALUE = "1";

type ProbeRow = {
  id: string;
  latitude?: number | null;
  longitude?: number | null;
  geocode_status?: string | null;
  geocode_error?: string | null;
  geocoded_at?: string | null;
  normalized_address?: string | null;
};

type ProbeResponse = {
  ok?: boolean;
  debug?: {
    probe?: ProbeRow | null;
  };
  error?: string;
};

type RetryResponse = {
  ok?: boolean;
  geocoded?: boolean;
  error?: string;
};

export default function AdminGeocodeToolPage() {
  const [eventId, setEventId] = React.useState("");
  const [probe, setProbe] = React.useState<ProbeRow | null>(null);
  const [loadingProbe, setLoadingProbe] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function loadProbe() {
    const id = eventId.trim();
    if (!id) {
      setError("Enter an event ID first.");
      setProbe(null);
      return;
    }

    setLoadingProbe(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/events/map-pins/?debug=1&probeId=${encodeURIComponent(id)}`,
        {
          cache: "no-store",
          credentials: "same-origin",
        }
      );

      const json = (await res.json().catch(() => ({}))) as ProbeResponse;

      if (!res.ok) {
        throw new Error(json?.error || `Probe failed (${res.status})`);
      }

      setProbe(json?.debug?.probe ?? null);
      if (!json?.debug?.probe) {
        setMessage("No matching event was found for that ID.");
      }
    } catch (e: any) {
      setProbe(null);
      setError(e?.message || "Failed to inspect event.");
    } finally {
      setLoadingProbe(false);
    }
  }

  async function retryGeocode() {
    const id = eventId.trim();
    if (!id) {
      setError("Enter an event ID first.");
      return;
    }

    setRetrying(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/events/retry-geocode/", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
        },
        body: JSON.stringify({ id }),
      });

      const json = (await res.json().catch(() => ({}))) as RetryResponse;

      if (!res.ok) {
        throw new Error(json?.error || `Retry failed (${res.status})`);
      }

      setMessage(json?.geocoded ? "Geocoding succeeded." : "Geocoding did not succeed.");
      await loadProbe();
    } catch (e: any) {
      setError(e?.message || "Retry failed.");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Published Event Geocode Tool</h1>
      <p className="text-sm text-gray-600 mb-6">
        Inspect a published event’s geocode fields and retry geocoding if it is missing map coordinates.
      </p>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium mb-2">Event ID</label>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="e.g. d9339c1c-7a33-4da3-ade7-24437c7d1675"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={loadProbe}
            disabled={loadingProbe || retrying}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingProbe ? "Inspecting…" : "Inspect"}
          </button>
          <button
            type="button"
            onClick={retryGeocode}
            disabled={retrying || loadingProbe}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-orange-50 disabled:opacity-50"
          >
            {retrying ? "Retrying…" : "Retry geocode"}
          </button>
        </div>

        {message ? (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {probe ? (
          <div className="mt-4 rounded-lg border bg-gray-50 p-4">
            <h2 className="text-sm font-semibold mb-3">Current status</h2>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <dt className="font-medium text-gray-700">ID</dt>
                <dd className="text-gray-900 break-all">{probe.id}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">Geocode status</dt>
                <dd className="text-gray-900">{probe.geocode_status || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">Latitude</dt>
                <dd className="text-gray-900">
                  {probe.latitude == null ? "—" : String(probe.latitude)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">Longitude</dt>
                <dd className="text-gray-900">
                  {probe.longitude == null ? "—" : String(probe.longitude)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">Normalized address</dt>
                <dd className="text-gray-900 break-words">{probe.normalized_address || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">Geocode error</dt>
                <dd className="text-gray-900 break-words">{probe.geocode_error || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">Geocoded at</dt>
                <dd className="text-gray-900">{probe.geocoded_at || "—"}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold mb-2">Known missing event</h2>
        <p className="text-sm text-gray-700">
          Paste this ID to repair the currently missing map row:
        </p>
        <code className="mt-2 block rounded bg-gray-100 px-3 py-2 text-sm">
          d9339c1c-7a33-4da3-ade7-24437c7d1675
        </code>
      </div>
    </main>
  );
}
