"use client";

import * as React from "react";

export default function SubmitEventPage() {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  // facets for category dropdown
  const [categories, setCategories] = React.useState<string[]>([]);
  const [catsError, setCatsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/events/facets", { cache: "no-store" });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || res.statusText);
        setCategories(j.categories || []);
      } catch (e: any) {
        setCatsError(e?.message || "Failed to load categories");
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    const formEl = e.currentTarget as HTMLFormElement;
    const payload = Object.fromEntries(new FormData(formEl).entries());

    try {
      const res = await fetch("/api/submit-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : {};
      if (!res.ok) throw new Error((data as any)?.error || res.statusText);

      setMsg("✅ Submitted for review. Thanks!");
      (formRef.current ?? formEl).reset();
    } catch (err: any) {
      setMsg(`❌ ${err?.message || "Submit failed"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Submit an Event</h1>

      <form ref={formRef} className="space-y-4" onSubmit={onSubmit}>
        {/* required */}
        <div>
          <label className="block text-sm font-medium">Title *</label>
          <input name="title" required className="border p-2 w-full" />
        </div>

        <div>
          <label className="block text-sm font-medium">Description *</label>
          <textarea name="description" required rows={4} className="border p-2 w-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Starts at *</label>
            <input type="datetime-local" name="starts_at" required className="border p-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium">Ends at</label>
            <input type="datetime-local" name="ends_at" className="border p-2 w-full" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Location name *</label>
          <input name="location_name" required className="border p-2 w-full" />
        </div>

        {/* optional but captured */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">City</label>
            <input name="city" className="border p-2 w-full" placeholder="Lisboa" />
          </div>
          <div>
            <label className="block text-sm font-medium">Address</label>
            <input name="address" className="border p-2 w-full" />
          </div>

          {/* Category PICK LIST ONLY (required) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Category *</label>
            <select
              name="category"
              className="border p-2 w-full"
              required
              disabled={!categories.length && !catsError}
              defaultValue=""
            >
              <option value="" disabled>
                {catsError ? `Failed to load: ${catsError}` : "Select a category"}
              </option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-1">
              Choose a category from the list. (Free typing is disabled to keep categories consistent.)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">Age</label>
            <input name="age" className="border p-2 w-full" placeholder="All ages, 18+ ..." />
          </div>
          <div>
            <label className="block text-sm font-medium">Ticket URL</label>
            <input type="url" name="ticket_url" className="border p-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium">Image URL</label>
            <input type="url" name="image_url" className="border p-2 w-full" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Organizer email *</label>
          <input type="email" name="organizer_email" required className="border p-2 w-full" />
        </div>

        <div>
          <label className="block text-sm font-medium">All day?</label>
          <select name="all_day" className="border p-2 w-full">
            <option value="">No</option>
            <option value="true">Yes</option>
          </select>
        </div>

        <button disabled={busy} className="px-4 py-2 border rounded">
          {busy ? "Submitting…" : "Submit"}
        </button>

        {msg && <p className="text-sm mt-3">{msg}</p>}
      </form>
    </main>
  );
}
