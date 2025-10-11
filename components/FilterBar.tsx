"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function FilterBar({ onFilter }: { onFilter: (filters: any) => void }) {
  const [categories, setCategories] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    city: "",
    dateRange: "",
    is_free: false,
    priceRange: "",
    age: "",
  });

  useEffect(() => {
    async function loadOptions() {
      try {
        const { data: catData } = await supabase.from("category_catalog").select("name");
        if (catData) setCategories(catData.map((c: any) => c.name));

        const { data: eventData } = await supabase
          .from("event_submissions")
          .select("city")
          .eq("status", "approved");
        if (eventData) {
          const uniqueCities = Array.from(
            new Set(eventData.map((e: any) => e.city).filter(Boolean))
          );
          setCities(uniqueCities);
        }
      } catch (err) {
        console.error("Error loading filter data:", err);
      }
    }
    loadOptions();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const name = target.name;
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;

    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const handleClear = () => {
    const cleared = {
      search: "",
      category: "",
      city: "",
      dateRange: "",
      is_free: false,
      priceRange: "",
      age: "",
    };
    setFilters(cleared);
    onFilter(cleared);
  };

  return (
    <div className="bg-[#fff1e8] border border-orange-200 rounded-xl p-2 mb-6 shadow-sm sticky top-0 z-30 backdrop-blur-md bg-opacity-95">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 text-sm">

        <input
          type="text"
          name="search"
          placeholder="Search events..."
          value={filters.search}
          onChange={handleChange}
          className="border border-orange-200 rounded-lg p-1.5 w-full focus:ring-1 focus:ring-[#c94917]"
        />

        <select
          name="category"
          value={filters.category}
          onChange={handleChange}
          className="border border-orange-200 rounded-lg p-1.5 w-full focus:ring-1 focus:ring-[#c94917]"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          name="city"
          value={filters.city}
          onChange={handleChange}
          className="border border-orange-200 rounded-lg p-1.5 w-full focus:ring-1 focus:ring-[#c94917]"
        >
          <option value="">All Cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        <select
          name="dateRange"
          value={filters.dateRange}
          onChange={handleChange}
          className="border border-orange-200 rounded-lg p-1.5 w-full focus:ring-1 focus:ring-[#c94917]"
        >
          <option value="">Any Date</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>

        <select
          name="priceRange"
          value={filters.priceRange}
          onChange={handleChange}
          className="border border-orange-200 rounded-lg p-1.5 w-full focus:ring-1 focus:ring-[#c94917]"
        >
          <option value="">Any Price</option>
          <option value="under10">Under €10</option>
          <option value="10to30">€10–30</option>
          <option value="30plus">Over €30</option>
        </select>

        <select
          name="age"
          value={filters.age}
          onChange={handleChange}
          className="border border-orange-200 rounded-lg p-1.5 w-full focus:ring-1 focus:ring-[#c94917]"
        >
          <option value="">All Ages</option>
          <option value="16">16+</option>
          <option value="18">18+</option>
          <option value="21">21+</option>
        </select>

        <label className="flex items-center gap-2 text-xs border border-orange-200 rounded-lg p-1.5 bg-white shadow-sm">
          <input
            type="checkbox"
            name="is_free"
            checked={!!filters.is_free}
            onChange={handleChange}
            className="accent-[#c94917]"
          />
          <span className="font-medium text-[#40210f]">Free Only</span>
        </label>
      </div>

      <div className="flex justify-end mt-2">
        <button
          onClick={handleClear}
          className="bg-[#c94917] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#a53f12] transition"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
