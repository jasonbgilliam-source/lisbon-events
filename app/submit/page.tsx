"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Status = "idle" | "loading" | "success" | "error";

const AUDIENCE_ALL = "All Ages";
const AUDIENCE_SPECIFIC = ["Family", "Kids", "Teens", "Adults"] as const;
const AUDIENCE_OPTIONS = [AUDIENCE_ALL, ...AUDIENCE_SPECIFIC] as const;

export default function SubmitEventPage() {
  const audienceOptions = useMemo(() => AUDIENCE_OPTIONS.slice(), []);

  const [form, setForm] = useState({
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    location_name: "",
    address: "",
    city: "",
    // ✅ Default is All Ages (exclusive)
    // We send ONLY ["All Ages"] and let the server expand if it wants.
    audience: [AUDIENCE_ALL] as string[],
    // notes-only / legacy
    age: "",
    price: "",
    category: "",
    organizer_email: "",
    ticket_url: "",
    image_url: "",
    youtube_url: "",
    spotify_url: "",
    is_free: false,
  });

  const [categories, setCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase.from("category_catalog").select("name");
      if (error) console.error(error);
      else setCategories((data || []).map((c: any) => c.name));
    }
    loadCategories();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  // ✅ Audience logic:
  // - "All Ages" is exclusive
  // - Selecting any specific audience removes "All Ages"
  // - If user deselects all specifics, revert back to ["All Ages"]
  const toggleAudience = (value: string) => {
    setForm((prev) => {
      const current = Array.isArray(prev.audience) ? prev.audience : [];

      if (value === AUDIENCE_ALL) {
        // If All Ages is clicked, set it as the only selection
        // (or keep it selected)
        return { ...prev, audience: [AUDIENCE_ALL] };
      }

      // Otherwise toggling a specific audience
      const withoutAllAges = current.filter((x) => x !== AUDIENCE_ALL);

      let next: string[];
      if (withoutAllAges.includes(value)) {
        next = withoutAllAges.filter((x) => x !== value);
      } else {
        next = [...withoutAllAges, value];
      }

      // If user removed all specifics, fall back to All Ages
      if (next.length === 0) next = [AUDIENCE_ALL];

      return { ...prev, audience: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const payload = { ...form };

      const res = await fetch("/api/submit-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to submit");

      setStatus("success");
      setForm({
        title: "",
        description: "",
        starts_at: "",
        ends_at: "",
        location_name: "",
        address: "",
        city: "",
        audience: [AUDIENCE_ALL],
        age: "",
        price: "",
        category: "",
        organizer_email: "",
        ticket_url: "",
        image_url: "",
        youtube_url: "",
        spotify_url: "",
        is_free: false,
      });
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-3 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md border border-orange-200 p-5 sm:p-6">
        <h1 className="text-2xl font-bold mb-3 text-[#c94917]">Submit an Event</h1>
        <p className="mb-5 text-sm text-gray-700">
          Share your Lisbon event with the community! Fill in all details below.
          Submissions are reviewed before publishing.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block font-medium mb-1">Event Title *</label>
            <input
              name="title"
              type="text"
              required
              value={form.title}
              onChange={handleChange}
              className="w-full border border-orange-200 rounded-md p-1.5 focus:ring-1 focus:ring-[#c94917]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1">Start Date/Time *</label>
              <input
                name="starts_at"
                type="datetime-local"
                required
                value={form.starts_at}
                onChange={handleChange}
                className="w-full border border-orange-200 rounded-md p-1.5 focus:ring-1 focus:ring-[#c94917]"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">End Date/Time</label>
              <input
                name="ends_at"
                type="datetime-local"
                value={form.ends_at}
                onChange={handleChange}
                className="w-full border border-orange-200 rounded-md p-1.5 focus:ring-1 focus:ring-[#c94917]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1">Venue *</label>
              <input
                name="location_name"
                type="text"
                required
                value={form.location_name}
                onChange={handleChange}
                className="w-full border border-orange-200 rounded-md p-1.5 focus:ring-1 focus:ring-[#c94917]"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">City</label>
              <input
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                className="w-full border border-orange-200 rounded-md p-1.5 focus:ring-1 focus:ring-[#c94917]"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">Address</label>
            <input
              name="address"
              type="text"
              value={form.address}
              onChange={handleChange}
              className="w-full border border-orange-200 rounded-md p-1.5 focus:ring-1 focus:ring-[#c94917]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1">Price</label>
              <input
                name="price"
                type="text"
                disabled={form.is_free}
                value={form.is_free ? "Free" : form.price}
                onChange={handleChange}
                className={`w-full border border-orange-200 rounded-md p-1.5 focus:ring-1 focus:ring-[#c94917] ${
                  form.is_free ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Free Event</label>
              <select
                name="is_free"
                value={form.is_free ? "true" : "false"}
                onChange={(e) => {
                  const value = e.target.value === "true";
                  setForm({
                    ...form,
                    is_free: value,
                    price: value ? "Free" : "",
                  });
                }}
                className="w-full border border-orange-200 rounded-md p-1.5 focus:ring-1 focus:ring-[#c94917]"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>

          {/* ✅ Audience (exclusive All Ages, no client-side expansion) */}
          <div>
            <label className="block font-medium mb-1">Audience</label>
            <div className="flex flex-wrap gap-2">
              {audienceOptions.map((a) => {
                const active = form.audience.includes(a);
                return (
                  <button
                    type="button"
                    key={a}
                    onClick={() => toggleAudience(a)}
                    className={`px-3 py-1 border rounded-full text-sm transition ${
                      active
                        ? "bg-[#c94917] text-white border-[#c94917]"
                        : "bg-white text-[#c94917] border-[#c94917] hover:bg-orange-50"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-gray-600">
              “All Ages” is a wildcard. Select specific groups (Teens/Adults/etc.) for targeted events.
            </p>
          </div>

          <div>
            <label className="block font-medium mb-1">Age Restriction / Notes</label>
            <input
              name="age"
              type="text"
              placeholder='Examples: "18+", "PG-13", "Adults only"'
              value={form.age}
              onChange={handleChange}
              className="w-full border border-orange-200 rounded-md p-1.5 focus:ring-1 focus:ring-[#c94917]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1">Organizer Email *</label>
              <input
                name="organizer_email"
                type="email"
                required
                value={form.organizer_email}
                onChange={handleChange}
                className="w-full border border-orange-200 rounded-md p-1.5 focus:ring-1 focus:ring-[#c94917]"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Category *</label>
              <select
                name="category"
                required
                value={form.category}
                onChange={handleChange}
                className="w-full border border-orange-200 rounded-md p-1.5 focus:ring-1 focus:ring-[#c94917]"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { name: "ticket_url", label: "Ticket URL" },
              { name: "image_url", label: "Event Image URL" },
              { name: "youtube_url", label: "YouTube URL" },
              { name: "spotify_url", label: "Spotify URL" },
            ].map((f) => (
              <div key={f.name}>
                <label className="block font-medium mb-1">{f.label}</label>
                <input
                  name={f.name}
                  type="url"
                  value={form[f.name as keyof typeof form] as string}
                  onChange={handleChange}
                  className="w-full border border-orange-200 rounded-md p-1.5 focus:ring-1 focus:ring-[#c94917]"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block font-medium mb-1">Description *</label>
            <textarea
              name="description"
              rows={3}
              required
              value={form.description}
              onChange={handleChange}
              className="w-full border border-orange-200 rounded-md p-1.5 focus:ring-1 focus:ring-[#c94917]"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-[#c94917] text-white py-2 rounded-md font-semibold hover:bg-[#a53f12] transition"
          >
            {status === "loading"
              ? "Submitting..."
              : status === "success"
              ? "✅ Submitted!"
              : "Submit Event"}
          </button>

          {status === "error" && (
            <p className="mt-2 text-red-600 font-medium text-sm">
              ❌ Something went wrong. Please check your entries and try again.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
