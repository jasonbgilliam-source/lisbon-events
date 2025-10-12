"use client";

import React, { useState } from "react";

type FilterBarProps = {
  onFilter: (filters: any) => void;
};

export default function FilterBar({ onFilter }: FilterBarProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string[]>([]);
  const [audience, setAudience] = useState<string[]>([]);
  const [isFree, setIsFree] = useState(false);

  // You can edit these lists anytime
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

  const allAudiences = ["All Ages", "Family", "Kids", "Teens", "Adults"];

  const toggle = (value: string, list: string[], setter: any) => {
    if (list.includes(value)) {
      setter(list.filter((x) => x !== value));
    } else {
      setter([...list, value]);
    }
  };

  const applyFilters = () => {
    onFilter({
      search,
      categories: category,
      audience,
      is_free: isFree,
    });
  };

  return (
    <div className="bg-white border border-orange-200 rounded-2xl p-4 mb-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <button
          onClick={applyFilters}
          className="px-4 py-2 bg-[#c94917] text-white rounded-lg hover:bg-orange-600 transition"
        >
          Apply Filters
        </button>
      </div>

      {/* Category Filter */}
      <div className="mb-3">
        <h3 className="font-semibold text-[#c94917] mb-2">Categories</h3>
        <div className="flex flex-wrap gap-2">
          {allCategories.map((c) => (
            <button
              key={c}
              onClick={() => toggle(c, category, setCategory)}
              className={`px-3 py-1 border rounded-full text-sm transition ${
                category.includes(c)
                  ? "bg-[#c94917] text-white border-[#c94917]"
                  : "bg-white text-[#c94917] border-[#c94917] hover:bg-orange-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Audience Filter */}
      <div className="mb-3">
        <h3 className="font-semibold text-[#c94917] mb-2">Audience</h3>
        <div className="flex flex-wrap gap-2">
          {allAudiences.map((a) => (
            <button
              key={a}
              onClick={() => toggle(a, audience, setAudience)}
              className={`px-3 py-1 border rounded-full text-sm transition ${
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

      {/* Free Events Toggle */}
      <div className="flex items-center gap-2 mt-3">
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
