"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

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

type EventForm = {
  id: string;
  slug?: string | null;
  title?: string | null;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  location_name?: string | null;
  city?: string | null;
  address?: string | null;
  category?: string | null;
  source_url?: string | null;
  ticket_url?: string | null;
  image_url?: string | null;
  organizer_email?: string | null;
  age?: string | null;
  audience?: string[] | string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  all_day?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  geocode_status?: string | null;
  normalized_address?: string | null;
};

function safeTrim(v?: string | null) {
  return String(v || "").trim();
}

function audienceToString(audience: EventForm["audience"]) {
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

export default function AdminEditEventPage() {
  const params = useParams();
  const router = useRouter();
  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [isCitywide, setIsCitywide] = React.useState(false);
  const [form, setForm] = React.useState<EventForm>({
    id: "",
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    location_name: "",
    city: "",
    address: "",
    category: "",
    source_url: "",
    ticket_url: "",
    image_url: "",
    organizer_email: "",
    age: "",
    audience: "",
    youtube_url: "",
    spotify_url: "",
    all_day: false,
  });

  React.useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
        const res = await fetch(`/api/admin/events/${encodeURIComponent(id)}`, {
          cache: "no-store",
          credentials: "same-origin",
        });

        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(j.error || "Failed to load event");
        }

        const item = j.item || {};
        const citywideGuess =
          safeTrim(item.geocode_status).toLowerCase() === "citywide" ||
          safeTrim(item.location_name) === CITYWIDE_LABEL;

        setIsCitywide(citywideGuess);
        setForm({
          ...item,
          starts_at: toInputDateTime(item.starts_at),
          ends_at: toInputDateTime(item.ends_at),
          audience: audienceToString(item.audience),
        });
      } catch (e: any) {
        setError(e.message || "Failed to load event");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  function update(patch: Partial<EventForm>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        ...form,
        starts_at: fromInputDateTime(form.starts_at),
        ends_at: fromInputDateTime(form.ends_at),
        audience: typeof form.audience === "string" ? form.audience : audienceToString(form.audience),
        is_citywide: isCitywide,
      };

      const res = await fetch(`/api/admin/events/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error || "Failed to save event");
      }

      setMessage("Event updated successfully.");
      if (j.slug) {
        setForm((prev) => ({ ...prev, slug: j.slug }));
      }
    } catch (e: any) {
      setError(e.message || "Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="p-6 max-w-4xl mx-auto">Loading event…</main>;
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Edit Published Event</h1>
          <div className="text-sm text-gray-500 mt-1">Event ID: {id}</div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            className="border px-3 py-2 rounded"
            type="button"
            onClick={() => router.push("/admin/submissions")}
          >
            Back to submissions
          </button>

          {form.slug ? (
            <a
              className="border px-3 py-2 rounded"
              href={`/events/${encodeURIComponent(String(form.slug))}`}
              target="_blank"
              rel="noreferrer"
            >
              View public page
            </a>
          ) : null}
        </div>
      </div>

      {error ? <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div> : null}
      {message ? <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-green-700">{message}</div> : null}

      <div className="mb-4 rounded-lg border bg-amber-50 p-3 text-sm text-amber-900">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={isCitywide}
            onChange={(e) => {
              const checked = e.target.checked;
              setIsCitywide(checked);
              if (checked) {
                setForm((prev) => ({
                  ...prev,
                  location_name: safeTrim(prev.location_name) || CITYWIDE_LABEL,
                  city: safeTrim(prev.city) || "Lisbon",
                  address: "",
                }));
              }
            }}
            className="mt-0.5"
          />
          <span>
            <strong>Citywide / multiple locations</strong>
            <span className="block mt-1 text-amber-800">
              Use Lisbon-wide fallback coordinates instead of a specific address.
            </span>
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Title</label>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.title ?? ""} onChange={(e) => update({ title: e.target.value })} />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Category</label>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={form.category ?? ""}
            onChange={(e) => update({ category: e.target.value })}
          >
            <option value="">Select category</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Starts at</label>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" type="datetime-local" value={form.starts_at ?? ""} onChange={(e) => update({ starts_at: e.target.value })} />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Ends at</label>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" type="datetime-local" value={form.ends_at ?? ""} onChange={(e) => update({ ends_at: e.target.value })} />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Venue / location name</label>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.location_name ?? ""} onChange={(e) => update({ location_name: e.target.value })} />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">City</label>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.city ?? ""} onChange={(e) => update({ city: e.target.value })} />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Address</label>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={form.address ?? ""}
            onChange={(e) => update({ address: e.target.value })}
            disabled={isCitywide}
            placeholder={isCitywide ? "Not required for citywide events" : "Street address"}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Description</label>
          <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={6} value={form.description ?? ""} onChange={(e) => update({ description: e.target.value })} />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Source URL</label>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.source_url ?? ""} onChange={(e) => update({ source_url: e.target.value })} />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Ticket URL</label>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.ticket_url ?? ""} onChange={(e) => update({ ticket_url: e.target.value })} />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Image URL</label>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.image_url ?? ""} onChange={(e) => update({ image_url: e.target.value })} />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Organizer email</label>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.organizer_email ?? ""} onChange={(e) => update({ organizer_email: e.target.value })} />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Age</label>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.age ?? ""} onChange={(e) => update({ age: e.target.value })} />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Audience</label>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={typeof form.audience === "string" ? form.audience : audienceToString(form.audience)} onChange={(e) => update({ audience: e.target.value })} placeholder="All Ages, Family, Adults" />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">All day</label>
          <label className="flex items-center gap-2 text-sm pt-2">
            <input type="checkbox" checked={!!form.all_day} onChange={(e) => update({ all_day: e.target.checked })} />
            <span>Event lasts all day</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">YouTube URL</label>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.youtube_url ?? ""} onChange={(e) => update({ youtube_url: e.target.value })} />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Spotify URL</label>
          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.spotify_url ?? ""} onChange={(e) => update({ spotify_url: e.target.value })} />
        </div>
      </div>

      <div className="mt-4 rounded-lg border bg-gray-50 p-3 text-sm text-gray-700">
        Saving will update the published event directly and refresh its geocoding based on the edited venue/address/city, or use Lisbon-wide fallback coordinates if citywide is enabled.
      </div>

      <div className="mt-6 flex gap-3 flex-wrap">
        <button
          className="border px-4 py-2 rounded bg-white"
          type="button"
          onClick={() => router.push("/admin/submissions")}
        >
          Back to submissions
        </button>

        <button
          className="border px-4 py-2 rounded bg-green-50"
          type="button"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save published event"}
        </button>
      </div>
    </main>
  );
}
