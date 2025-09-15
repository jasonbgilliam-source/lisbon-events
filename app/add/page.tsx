"use client";

import * as React from "react";

export default function AddEventPage() {
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleAddEventSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);

    try {
      const form = new FormData(e.currentTarget);

      const payload = {
        title: String(form.get("title") || "").trim(),
        start: String(form.get("start") || "").trim(),
        end: String(form.get("end") || "").trim(),
        all_day: String(form.get("all_day") || "").trim(), // "true" / "false"
        venue: String(form.get("venue") || "").trim(),
        city: String(form.get("city") || "").trim(),
        address: String(form.get("address") || "").trim(),
        price: String(form.get("price") || "").trim(),
        age: String(form.get("age") || "").trim(),
        category: String(form.get("category") || "").trim(),
        description: String(form.get("description") || "").trim(),
        organizer: String(form.get("organizer") || "").trim(),
        source_url: String(form.get("source_url") || "").trim(),
        tags: String(form.get("tags") || "").trim(),
        recurrence_note: String(form.get("recurrence_note") || "").trim(),
      };

      if (!payload.title || !payload.start) {
        setMessage("Please fill in at least Title and Start");
        return;
      }

      const res = await fetch("/api/add-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? res.statusText);

      setMessage("✅ Event submitted!");
      (e.currentTarget as HTMLFormElement).reset();
    } catch (err: any) {
      setMessage(`❌ Submit failed: ${err.message ?? "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Add Event</h1>

      <form onSubmit={handleAddEventSubmit} className="space-y-4">
        {/* Required */}
        <div>
          <label className="block text-sm font-medium">Title *</label>
          <input name="title" className="border p-2 w-full" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Start (date/time) *</label>
          <input name="start" type="datetime-local" className="border p-2 w-full" required />
        </div>

        {/* Optional */}
        <div>
          <label className="block text-sm font-medium">End (date/time)</label>
          <input name="end" type="datetime-local" className="border p-2 w-full" />
        </div>

        <div>
          <label className="block text-sm font-medium">All Day</label>
          <select name="all_day" className="border p-2 w-full">
            <option value="">(no)</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium">Venue</label><input name="venue" className="border p-2 w-full" /></div>
          <div><label className="block text-sm font-medium">City</label><input name="city" className="border p-2 w-full" /></div>
          <div><label className="block text-sm font-medium">Address</label><input name="address" className="border p-2 w-full" /></div>
          <div><label className="block text-sm font-medium">Price</label><input name="price" className="border p-2 w-full" /></div>
          <div><label className="block text-sm font-medium">Age</label><input name="age" className="border p-2 w-full" /></div>
          <div><label className="block text-sm font-medium">Category</label><input name="category" className="border p-2 w-full" /></div>
        </div>

        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea name="description" className="border p-2 w-full" rows={4} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium">Organizer</label><input name="organizer" className="border p-2 w-full" /></div>
          <div><label className="block text-sm font-medium">Source URL</label><input name="source_url" type="url" className="border p-2 w-full" /></div>
          <div><label className="block text-sm font-medium">Tags (comma-separated)</label><input name="tags" className="border p-2 w-full" /></div>
          <div><label className="block text-sm font-medium">Recurrence Note</label><input name="recurrence_note" className="border p-2 w-full" /></div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 border rounded"
        >
          {busy ? "Submitting…" : "Submit"}
        </button>

        {message && <p className="mt-3 text-sm">{message}</p>}
      </form>
    </main>
  );
}
