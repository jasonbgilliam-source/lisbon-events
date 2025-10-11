"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SubmitEventPage() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    location_name: "",
    address: "",
    city: "",
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
  const [status, setStatus] =
    useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase.from("category_catalog").select("name");
      if (error) console.error(error);
      else setCategories(data.map((c: any) => c.name));
    }
    loadCategories();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/submit-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
          {/* Title */}
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

          {/* Start / End Dates */}
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

          {/* Venue + City */}
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

          {/* Address */}
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

          {/* Price / Free / Age */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <div>
              <label className="block font-medium mb-1">Age Restriction</label>
              <input
                name="age"
                type="text"
                value={form.age}
                onChange={handleChange}
                className="w-full border border-orange-200 rounded-md p-1.5 focus:ring-1 focus:ring-[#c94917]"
              />
            </div>
          </div>

          {/* Organizer Email / Category */}
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

          {/* URLs */}
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

          {/* Description */}
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

          {/* Submit */}
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
