"use client";

import React from "react";

export type EventFilters = {
  search: string;
  categories: string[];
  audience: string[];
  is_free: boolean;
};

type FilterBarProps = {
  value: EventFilters;
  onChange: (next: EventFilters) => void;
  availableCategories?: string[];
};

const ALL_AUDIENCES = ["All Ages", "Family", "Kids", "Teens", "Adults"];

function isDefaultFilters(value: EventFilters) {
  return (
    value.search === "" &&
    value.categories.length === 0 &&
    value.audience.length === 0 &&
    value.is_free === false
  );
}

export default function FilterBar({
  value,
  onChange,
  availableCategories = [],
}: FilterBarProps) {
  function toggleCategory(category: string) {
    const nextCategories = value.categories.includes(category)
      ? value.categories.filter((x) => x !== category)
      : [...value.categories, category];

    onChange({
      ...value,
      categories: nextCategories,
    });
  }

  function toggleAudience(aud: string) {
    const has = value.audience.includes(aud);

    if (aud === "All Ages") {
      onChange({
        ...value,
        audience: has ? [] : ["All Ages"],
      });
      return;
    }

    let nextAudience = has
      ? value.audience.filter((x) => x !== aud)
      : [...value.audience, aud];

    nextAudience = nextAudience.filter((x) => x !== "All Ages");

    onChange({
      ...value,
      audience: nextAudience,
    });
  }

  function clearFilters() {
    onChange({
      search: "",
      categories: [],
      audience: [],
      is_free: false,
    });
  }

  const chipClass = (active: boolean) =>
    [
      "px-2.5 py-1 rounded-full text-xs border transition",
      active
        ? "bg-[#c94917] text-white border-[#c94917]"
        : "bg-white text-[#c94917] border-[#c94917] hover:bg-orange-50",
    ].join(" ");

  return (
    <div className="mb-6 rounded-xl border border-orange-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            type="text"
            placeholder="Search events..."
            value={value.search}
            onChange={(e) =>
              onChange({
                ...value,
                search: e.target.value,
              })
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />

          <label className="flex items-center gap-2 whitespace-nowrap text-sm text-gray-700">
            <input
              id="free"
              type="checkbox"
              checked={value.is_free}
              onChange={(e) =>
                onChange({
                  ...value,
                  is_free: e.target.checked,
                })
              }
            />
            <span>Free only</span>
          </label>

          <button
            type="button"
            onClick={clearFilters}
            disabled={isDefaultFilters(value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        {availableCategories.length > 0 ? (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Categories
            </div>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className={chipClass(value.categories.includes(c))}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Audience
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_AUDIENCES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAudience(a)}
                className={chipClass(value.audience.includes(a))}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
