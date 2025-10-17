"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import CategoryCard from "@/components/CategoryCard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type EventItem = {
  id: string | number;
  title: string;
  categories?: string[] | string | null;
  status?: string;
};

export default function CategoriesInner() {
  const [categoryCounts, setCategoryCounts] = useState<
    { category: string; count: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);

      const { data, error } = await supabase
        .from("event_submissions")
        .select("categories, status")
        .eq("status", "approved");

      if (error) {
        console.error("Error loading events:", error);
        setLoading(false);
        return;
      }

      // 🧠 Count occurrences of each category
      const counts: Record<string, number> = {};

      (data || []).forEach((e) => {
        if (!e.categories) return;

        // Normalize categories whether stored as array or string
        let cats: string[] = [];
        if (Array.isArray(e.categories)) {
          cats = e.categories;
        } else if (typeof e.categories === "string") {
          cats = e.categories
            .replace(/[{}"]/g, "")
            .split(",")
            .map((x) => x.trim());
        }

        cats.forEach((cat) => {
          if (!cat) return;
          const key = cat.trim();
          counts[key] = (counts[key] || 0) + 1;
        });
      });

      // Convert to array for rendering
      const sorted = Object.entries(counts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      setCategoryCounts(sorted);
      setLoading(false);
    }

    loadEvents();
  }, []);

  if (loading)
    return (
      <p className="text-center text-gray-500 italic mt-10">
        Loading categories…
      </p>
    );

  if (categoryCounts.length === 0)
    return (
      <p className="text-center text-gray-600 italic mt-10">
        No categories found.
      </p>
    );

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <section className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-[#c94917]">
          Event Categories
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categoryCounts.map(({ category, count }) => (
            <div key={category} className="relative">
              <CategoryCard category={category} />
              <span className="absolute top-2 right-3 bg-[#c94917] text-white text-xs px-2 py-1 rounded-full shadow-md">
                {count}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
