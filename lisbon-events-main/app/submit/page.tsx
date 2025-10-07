"use client";

import { useState } from "react";

export default function SubmitEventPage() {
  const [form, setForm] = useState({
    title: "",
    start: "",
    end: "",
    venue: "",
    city: "",
    address: "",
    price: "",
    age: "",
    category: "",
    description: "",
    organizer: "",
    source_url: "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("success");
      setForm({
        title: "",
        start: "",
        end: "",
        venue: "",
        city: "",
        address: "",
        price: "",
        age: "",
        category: "",
        description: "",
        organizer: "",
        source_url: "",
      });
    } catch {
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
          Share your Lisbon event with the community! Fill in the details below.
          Submissions are reviewed before publishing.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: "title", label: "Event Title", type: "text", required: true },
            { name: "start", label: "Start Date", type: "datetime-local", required: true },
            { name: "end", label: "End Date", type: "datetime-local" },
            { name: "venue", label: "Venue", type: "text" },
            { name: "city", label: "City", type: "text" },
            { name: "address", label: "Address", type: "text" },
            { name: "price", label: "Price", type: "text" },
            { name: "age", label: "Age Restriction", type: "text" },
            { name: "category", label: "Category", type: "text" },
            { name: "organizer", label: "Organizer", type: "text" },
            { name: "source_url", label: "Event Website or Source", type: "url" },
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
                value={form[f.name as keyof typeof form]}
                onChange={handleChange}
                className="w-full border border-orange-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#c94917]"
              />
            </div>
          ))}

          <div>
            <label className="block font-semibold mb-1" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
              className="w-full border border-orange-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#c94917]"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-[#c94917] text-white py-2 rounded-lg font-semibold hover:bg-[#a53f12]"
          >
            {status === "loading" ? "Submitting..." : "Submit Event"}
          </button>
        </form>

        {status === "success" && (
          <p className="mt-4 text-green-700 font-medium">
            ✅ Event submitted successfully!
          </p>
        )}
        {status === "error" && (
          <p className="mt-4 text-red-600 font-medium">
            ❌ Something went wrong. Please try again.
          </p>
        )}
      </div>
    </main>
  );
}
