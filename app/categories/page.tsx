"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

// ✅ Initialize Supabase (using your public anon key)
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

        // ✅ Get all events (only published ones if you have a status column)
        const { data, error } = await supabase
          .from("events") // or "event_submissions" if that's your source
          .select("category, status");

        if (error) throw error;

        // ✅ Filter to only approved / published events
        const validEvents = data.filter(
          (e: any) =>
            e.category &&
            e.category.trim() !== "" &&
            (!e.status || e.status === "approved" || e.status === "published")
        );

        // ✅ Count occurrences by category
        const counts: Record<string, number> = {};
        validEvents.forEach((e: any) => {
          const name = e.category.trim();
          counts[name] = (counts[name] || 0) + 1;
        });

        // ✅ Convert to array and sort alphabetically
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
              const slug = cat.name.toLowerCase().replace(/\s+/g, "-");
              const imageSlug = slug || "default";
              return (
                <Link
                  key={slug}
                  href={`/categories/${slug}`}
                  className="bg-white shadow-md hover:shadow-xl rounded-2xl overflow-hidden border border-orange-200 transition transform hover:-translate-y-1"
                >
                  <Image
                    src={`/images/${imageSlug}.jpg`}
                    alt={cat.name}
                    width={400}
                    height={250}
                    className="rounded-2xl object-cover w-full h-56"
                  />
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
