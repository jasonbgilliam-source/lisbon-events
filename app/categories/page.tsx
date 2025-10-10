"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// 🟠 Prevent static caching
export const dynamic = "force-dynamic";

// ✅ Initialize Supabase
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

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("events")
          .select("category");

        if (error) throw error;

        const valid = data.filter(
          (e: any) => e.category && e.category.trim() !== ""
        );

        const counts: Record<string, number> = {};
        valid.forEach((e: any) => {
          const name = e.category.trim();
          counts[name] = (counts[name] || 0) + 1;
        });

        const list = Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
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

  const getImagePath = (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    return `/images/${slug}.jpeg`;
  };

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f]">
      <section className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-6">
          Explore by Category
        </h1>
        <p className="text-center text-gray-600 mb-10">
          Choose a Lisbon vibe — from concerts and film to culture and cuisine.
        </p>

        {loading ? (
          <p className="text-center text-gray-600 italic">Loading categories…</p>
        ) : categories.length === 0 ? (
          <p className="text-center mt-10 text-gray-600 italic">
            No categories found yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((cat) => {
              const encodedName = encodeURIComponent(cat.name);
              const imagePath = getImagePath(cat.name);
              const fallbackPath = "/images/default.jpeg";

              return (
                <Link
                  key={encodedName}
                  href={`/categories/${encodedName}`}
                  className="bg-white shadow-md hover:shadow-xl rounded-2xl overflow-hidden border border-orange-200 transition transform hover:-translate-y-1"
                >
                  <div className="relative w-full h-56">
                    <img
                      src={imagePath}
                      alt={cat.name}
                      className="object-cover rounded-t-2xl w-full h-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = fallbackPath;
                      }}
                    />
                  </div>
                  <div className="p-5">
                    <h2 className="text-2xl font-semibold mb-1">{cat.name}</h2>
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
