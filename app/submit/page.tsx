"use client";

import * as React from "react";

export default function SubmitEventPage() {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    const f = new FormData(e.currentTarget);
    const payload = Object.fromEntries(f.entries());

    try {
      const res = await fetch("/api/submit-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || res.statusText);

      setMsg("✅ Submitted for review. Thanks!");
      (e.currentTarget as HTMLFormElement).reset();
    } catch (err: any) {
      setMsg(`❌ ${err.message || "Submit failed"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Submit an Event</h1>

      <form className="space-y-4" onSubmit={onSubmit}>
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
          <div><label className="block text-sm font-medium">City</label><input name="city" className="border p-2 w-full" placeholder="Lisbon" /></div>
          <div><label className="block text-sm font-medium">Address</label><input name="address" className="border p-2 w-full" /></div>
          <div><label className="block text-sm font-medium">Category</label><input name="category" className="border p-2 w-full" placeholder="Music, Food, Arts..." /></div>
          <div><label className="block text-sm font-medium">Age</label><input name="age" className="border p-2 w-full" placeholder="All ages, 18+ ..." /></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium">Ticket URL</label><input type="url" name="ticket_url" className="border p-2 w-full" /></div>
          <div><label className="block text-sm font-medium">Image URL</label><input type="url" name="image_url" className="border p-2 w-full" /></div>
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
