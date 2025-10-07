"use client";

import * as React from "react";

export type FilterState = {
  category: string;
  city: string;
  allAges: boolean;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
};

type Props = {
  value: FilterState;
  onChange: (next: FilterState) => void;
  onClear: () => void;
  // Optional facet options to populate dropdowns. You can pass [] and let users type.
  categories?: string[];
  cities?: string[];
};

export default function FilterBar({
  value,
  onChange,
  onClear,
  categories = [],
  cities = [],
}: Props) {
  const { category, city, allAges, from, to } = value;

  return (
    <div className="border rounded p-3 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        {/* Category (select + free text) */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1">Category</label>
          <div className="flex gap-2">
            <select
              className="border p-2 w-full"
              value={category}
              onChange={(e) => onChange({ ...value, category: e.target.value })}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              placeholder="or type…"
              className="border p-2 w-40"
              value={category}
              onChange={(e) => onChange({ ...value, category: e.target.value })}
            />
          </div>
        </div>

        {/* City */}
        <div className="md:col-span-1">
          <label className="block text-xs font-medium mb-1">City</label>
          <select
            className="border p-2 w-full"
            value={city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* From / To */}
        <div className="md:col-span-2 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1">From date</label>
            <input
              type="date"
              className="border p-2 w-full"
              value={from}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">To date</label>
            <input
              type="date"
              className="border p-2 w-full"
              value={to}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
            />
          </div>
        </div>

        {/* All ages + Clear */}
        <div className="md:col-span-1 flex items-end justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allAges}
              onChange={(e) => onChange({ ...value, allAges: e.target.checked })}
            />
            All ages
          </label>
          <button className="text-sm underline" onClick={onClear}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
