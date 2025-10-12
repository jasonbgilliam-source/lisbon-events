"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import FilterBar from "@/components/FilterBar";

export const dynamic = "force-dynamic";

// ✅ Supabase init
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type CategoryData = {
  name: string;
  count: number;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<any>({});

  // 🧭 Fetch categories from Supabase
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);

        // Get approved events
        const { data: events, error: eventError } = await supabase
          .from("event_submissions")
          .select("category, status, price, audience")
          .eq("status", "approved");

        if (eventError) throw eventError;

        // Get category catalog (for consistent naming)
        const { data: catalog, error: catError } = await supabase
          .from("category_catalog")
          .select("name");

        if (catError) throw catError;

        // Normalize catalog list
        const validCategories = (catalog || []).map((c) => c.name.trim());

        // Count how many events per category
        const counts: Record<string, number> = {};
        (events || []).forEach((e: any) => {
          if (e.category && e.category.trim() !== "") {
            const catName = e.category.trim();
            if (validCategories.includes(catName)) {
              counts[catName] = (counts[catName] || 0) + 1;
            }
          }
        });

        const list = validCategories
          .map((name) => ({
            name,
            count: counts[name] || 0,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setCategories(list);
      } catch (err) {
        console.error("Error loading categories:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  // 🧩 Filter behavior (future-proof — for audience/free filters)
  const filteredCategories = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) return categories;
    // For now, no filtering logic is applied to the category list,
    // but this placeholder ensures smooth extension later.
    return categories;
  }, [categories, filters]);

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f]">
      <section className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-6 text-[#c94917]">
          Explore by Category
        </h1>

        {/* 🧭 Consistent Filter Bar */}
        <FilterBar onFilter={setFilters} />

        <p className="text-center text-gray-600 mb-10">
          Choose a Lisbon vibe — from concerts and film to culture and cuisine.
        </p>

        {loading ? (
          <p className="text-center text-gray-600 italic">Loading categories…</p>
        ) : filteredCategories.length === 0 ? (
          <p className="text-center mt-10 text-gray-600 italic">
            No categories found yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCategories.map((cat) => {
              const slug = cat.name.toLowerCase().replace(/\s+/g, "-");
              const imagePath = `/images/${slug}.jpeg`;
              const fallbackPath = `/images/default.jpeg`;

              return (
                <Link
                  key={slug}
                  href={`/categories/${slug}`}
                  className="bg-white shadow-md hover:shadow-xl rounded-2xl overflow-hidden border border-orange-200 transition transform hover:-translate-y-1"
                >
                  <div className="relative w-full h-56">
                    <Image
                      src={imagePath}
                      alt={cat.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover rounded-t-2xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = fallbackPath;
                      }}
                    />
                  </div>
                  <div className="p-5">
                    <h2 className="text-2xl font-semibold mb-1 text-[#c94917]">
                      {cat.name}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {cat.count} event{cat.count === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
