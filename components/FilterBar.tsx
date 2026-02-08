"use client";

import React, { useEffect, useState } from "react";

type FilterBarProps = {
  onFilter: (filters: any) => void;
};

const ALL_AUDIENCES = ["All Ages", "Family", "Kids", "Teens", "Adults"];

export default function FilterBar({ onFilter }: FilterBarProps) {
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [audience, setAudience] = useState<string[]>([]);
  const [isFree, setIsFree] = useState(false);

  const allCategories = [
    "Music",
    "Theatre",
    "Cinema",
    "Festival",
    "Market",
    "Exhibition",
    "Workshop",
    "Dance",
    "Comedy",
    "Lecture",
    "Outdoor",
    "Food & Drink",
  ];

  function toggleCategory(value: string) {
    setCategories((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );
  }

  function toggleAudience(value: string) {
    setAudience((prev) => {
      const has = prev.includes(value);

      // All Ages is a wildcard toggle
      if (value === "All Ages") {
        return has ? [] : ["All Ages"];
      }

      let next = has ? prev.filter((x) => x !== value) : [...prev, value];

      // Remove All Ages if specific audiences are chosen
      next = next.filter((x) => x !== "All Ages");

      return next;
    });
  }

  // Auto-apply filters
  useEffect(() => {
    onFilter({
      search,
      categories,
      audience,
      is_free: isFree,
    });
  }, [search, categories, audience, isFree, onFilter]);

  return (
    <div className="bg-white border border-orange-200 rounded-2xl p-4 mb-8 shadow-sm">
      {/* Search */}
      <input
        type="text"
        placeholder="Search events..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
      />

      {/* Categories */}
      <div className="mb-4">
        <h3 className="font-semibold text-[#c94917] mb-2">Categories</h3>
        <div className="flex flex-wrap gap-2">
          {allCategories.map((c) => (
            <button
              key={c}
              onClick={() => toggleCategory(c)}
              className={`px-3 py-1 border rounded-full text-sm ${
                categories.includes(c)
                  ? "bg-[#c94917] text-white border-[#c94917]"
                  : "bg-white text-[#c94917] border-[#c94917] hover:bg-orange-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Audience */}
      <div className="mb-4">
        <h3 className="font-semibold text-[#c94917] mb-2">Audience</h3>
        <div className="flex flex-wrap gap-2">
          {ALL_AUDIENCES.map((a) => (
            <button
              key={a}
              onClick={() => toggleAudience(a)}
              className={`px-3 py-1 border rounded-full text-sm ${
                audience.includes(a)
                  ? "bg-[#c94917] text-white border-[#c94917]"
                  : "bg-white text-[#c94917] border-[#c94917] hover:bg-orange-50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Free */}
      <div className="flex items-center gap-2">
        <input
          id="free"
          type="checkbox"
          checked={isFree}
          onChange={(e) => setIsFree(e.target.checked)}
        />
        <label htmlFor="free" className="text-sm text-gray-700">
          Show only free events
        </label>
      </div>
    </div>
  );
}
