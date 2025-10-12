"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type FilterBarProps = {
  onFilter: (filters: any) => void;
};

export default function FilterBar({ onFilter }: FilterBarProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string[]>([]);
  const [audience, setAudience] = useState<string[]>([]);
  const [isFree, setIsFree] = useState(false);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  const allAudiences = ["All Ages", "Family", "Kids", "Teens", "Adults"];

  // 🧭 Load official category list from Supabase category_catalog
  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("category_catalog")
        .select("name")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error loading categories:", error);
        return;
      }

      const names =
        data?.map((c: { name: string }) => c.name).filter(Boolean) ?? [];
      setAllCategories(names);
    }

    loadCategories();
  }, []);

  // 🧩 Toggle logic + auto-apply
  const toggle = (value: string, list: string[], setter: any, key: string) => {
    const newList = list.includes(value)
      ? list.filter((x) => x !== value)
      : [...list, value];

    setter(newList);
    onFilter({
      search,
      categories: key === "categories" ? newList : category,
      audience: key === "audience" ? newList : audience,
      is_free: isFree,
    });
  };

  // 🧩 Apply search instantly
  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilter({
      search: value,
      categories: category,
      audience,
      is_free: isFree,
    });
  };

  // 🧩 Apply “Free” instantly
  const handleFreeChange = (checked: boolean) => {
    setIsFree(checked);
    onFilter({
      search,
      categories: category,
      audience,
      is_free: checked,
    });
  };

  // 🧹 Clear all filters
  const clearFilters = () => {
    setSearch("");
    setCategory([]);
    setAudience([]);
    setIsFree(false);
    onFilter({});
  };

  return (
    <div className="bg-white border border-orange-200 rounded-2xl p-4 mb-8 shadow-sm">
      {/* 🔍 Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <button
          onClick={clearFilters}
          className="px-4 py-2 bg-gray-100 text-[#c94917] border border-[#c94917] rounded-lg hover:bg-orange-50 transition"
        >
          Clear Filters
        </button>
      </div>

      {/* 🎭 Category Filter */}
      <div className="mb-4">
        <h3 className="font-semibold text-[#c94917] mb-2">Categories</h3>
        <div className="flex flex-wrap gap-2">
          {allCategories.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Loading categories…</p>
          ) : (
            allCategories.map((c) => (
              <button
                key={c}
                onClick={() => toggle(c, category, setCategory, "categories")}
                className={`px-3 py-1 border rounded-full text-sm transition ${
                  category.includes(c)
                    ? "bg-[#c94917] text-white border-[#c94917]"
                    : "bg-white text-[#c94917] border-[#c94917] hover:bg-orange-50"
                }`}
              >
                {c}
              </button>
            ))
          )}
        </div>
      </div>

      {/* 👨‍👩‍👧 Audience Filter */}
      <div className="mb-4">
        <h3 className="font-semibold text-[#c94917] mb-2">Audience</h3>
        <div className="flex flex-wrap gap-2">
          {allAudiences.map((a) => (
            <button
              key={a}
              onClick={() => toggle(a, audience, setAudience, "audience")}
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

      {/* 🆓 Free Events */}
      <div className="flex items-center gap-2 mt-3">
        <input
          id="free"
          type="checkbox"
          checked={isFree}
          onChange={(e) => handleFreeChange(e.target.checked)}
        />
        <label htmlFor="free" className="text-sm text-gray-700">
          Show only free events
        </label>
      </div>
    </div>
  );
}

