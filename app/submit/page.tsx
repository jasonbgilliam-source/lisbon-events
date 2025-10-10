<form onSubmit={handleSubmit} className="space-y-4">
  {[
    { name: "title", label: "Event Title", type: "text", required: true },
    { name: "starts_at", label: "Start Date/Time", type: "datetime-local", required: true },
    { name: "ends_at", label: "End Date/Time", type: "datetime-local" },
    { name: "location_name", label: "Venue", type: "text", required: true },
    { name: "city", label: "City", type: "text" },
    { name: "address", label: "Address", type: "text" },
    { name: "price", label: "Price", type: "text" },
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
        value={form[f.name as keyof typeof form]}
        onChange={handleChange}
        className="w-full border border-orange-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#c94917]"
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
      onChange={(e) => setForm({ ...form, is_free: e.target.value === "true" })}
      className="w-full border border-orange-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#c94917]"
    >
      <option value="false">No</option>
      <option value="true">Yes</option>
    </select>
  </div>

  {/* Category dropdown */}
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

  {/* Description */}
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
