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
    is_free: false, // ✅ new
  });

  const [categories, setCategories] = useState<string[]>([]);
  const [status, setStatus] =
    useState<"idle" | "loading" | "success" | "error">("idle");

  // ✅ Load categories from Supabase
  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("category_catalog")
        .select("name");
      if (error) console.error(error);
      else setCategories(data.map((c: any) => c.name));
    }
    loadCategories();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

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
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg border border-orange-200 p-8">
        <h1 className="text-3xl font-bold mb-6 text-[#c94917]">
          Submit an Event
        </h1>
        <p className="mb-6">
          Share your Lisbon event with the community! Fill in all details below.
          Submissions are reviewed before publishing.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: "title", label: "Event Title", type: "text", required: true },
            { name: "starts_at", label: "Start Date/Time", type: "datetime-local", required: true },
            { name: "ends_at", label: "End Date/Time", type: "datetime-local" },
            { name: "location_name", label: "Venue", type: "text", required: true },
            { name: "city", label: "City", type: "text" },
            { name: "address", label: "Address", type: "text" },
            {
              name: "price",
              label: "Price",
              type: "text",
              disabled: form.is_free, // ✅ disable if free
            },
            { name: "age", label: "Age Restriction", type: "text" },
            { name: "organizer_email", label: "Organizer Email", type: "email", required: true },
            { name: "ticket_url", label: "Ticket URL", type: "url" },
            { name: "image_url", label: "Event Image URL", type: "url" },
            { name: "youtube_url", label: "YouTube URL", type: "url" },
            { name: "spotify_url", label: "Spotify URL", type: "url" },
          ].map((f) => (
            <div key={f.name}>
              <label className="block font-semibold mb-1" htmlFor={f.name}>
                {f.label}
              </label>
              <input
                id={f.name}
                name={f.name}
                type={f.type}
                required={f.required}
                disabled={f.disabled}
                value={
                  f.name === "price" && form.is_free
                    ? "Free"
                    : String(form[f.name as keyof typeof form] ?? "")
                } // ✅ coerced to string
                onChange={handleChange}
                className={`w-full border border-orange-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#c94917] ${
                  f.disabled ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
              />
            </div>
          ))}

          {/* ✅ Free Event selector */}
          <div>
            <label className="block font-semibold mb-1" htmlFor="is_free">
              Free Event
            </label>
            <select
              id="is_free"
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
              className="w-full border border-orange-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#c94917]"
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>

          {/* ✅ Category dropdown */}
          <div>
            <label className="block font-semibold mb-1" htmlFor="category">
              Category
            </label>
            <select
              id="category"
              name="category"
              required
              value={form.category}
              onChange={handleChange}
              className="w-full border border-orange-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#c94917]"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ Description */}
          <div>
            <label className="block font-semibold mb-1" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              required
              value={form.description}
              onChange={handleChange}
              className="w-full border border-orange-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#c94917]"
            />
          </div>

          {/* ✅ Submit Button */}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-[#c94917] text-white py-2 rounded-lg font-semibold hover:bg-[#a53f12] transition"
          >
            {status === "loading"
              ? "Submitting..."
              : status === "success"
              ? "✅ Submitted!"
              : "Submit Event"}
          </button>

          {status === "error" && (
            <p className="mt-4 text-red-600 font-medium">
              ❌ Something went wrong. Please check your entries and try again.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
