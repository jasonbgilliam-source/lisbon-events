"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import FilterBar from "@/components/FilterBar";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type CategoryData = {
  name: string;
  count: number;
};

// Helper — normalize category names for fuzzy matching
const normalize = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);

        // 1️⃣ Get all approved events
        const { data: events, error: eventError } = await supabase
          .from("event_submissions")
          .select("categories, status")
          .eq("status", "approved");

        if (eventError) throw eventError;

        // 2️⃣ Get category catalog
        const { data: catalog, error: catError } = await supabase
          .from("category_catalog")
          .select("name")
          .order("name", { ascending: true });

        if (catError) throw catError;

        const validCategories = (catalog || []).map((c) => c.name.trim());
        const normalizedCatalog = validCategories.map(normalize);

        // 3️⃣ Count how many events per category
        const counts: Record<string, number> = {};

        (events || []).forEach((e: any) => {
          if (!e.categories) return;

          let eventCats: string[] = [];

          // Case 1: Array format
          if (Array.isArray(e.categories)) {
            eventCats = e.categories.map((c: string) => c.trim());
          }

          // Case 2: String like "{Music,Festival}"
          else if (typeof e.categories === "string" && e.categories.trim() !== "") {
            eventCats = e.categories
              .replace(/[{}[\]"]/g, "")
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean);
          }

          // Tally normalized matches
          eventCats.forEach((cat: string) => {
            const norm = normalize(cat);
            const idx = normalizedCatalog.indexOf(norm);
            const catName =
              idx >= 0
                ? validCategories[idx]
                : validCategories.find((valid) => normalize(valid) === norm) || "Other";

            counts[catName] = (counts[catName] || 0) + 1;
          });
        });

        // 4️⃣ Merge all categories (including 0-count ones)
        const list = validCategories
          .map((name) => ({
            name,
            count: counts[name] || 0,
          }))
          .concat(
            counts["Other"] ? [{ name: "Other", count: counts["Other"] }] : []
          )
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
        <h1 className="text-4xl font-bold text-center mb-6 text-[#c94917]">
          Explore by Category
        </h1>

        <Suspense
          fallback={
            <p className="text-center text-gray-500 italic mb-6">
              Loading filters…
            </p>
          }
        >
          <FilterBar onFilter={() => {}} />
        </Suspense>

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

              // Use .jpeg first, fallback to .jpg, then default
              const jpegPath = `/images/${slug}.jpeg`;
              const jpgPath = `/images/${slug}.jpg`;
              const fallbackPath = `/images/default.jpeg`;

              return (
                <Link
                  key={slug}
                  href={`/categories/${slug}`}
                  className="bg-white shadow-md hover:shadow-xl rounded-2xl overflow-hidden border border-orange-200 transition transform hover:-translate-y-1"
                >
                  <div className="relative w-full h-56">
                    <Image
                      src={jpegPath}
                      alt={cat.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover rounded-t-2xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.srcset = `${jpgPath}, ${fallbackPath}`;
                      }}
                    />
                    <span className="absolute top-2 right-2 bg-[#c94917] text-white text-xs px-2 py-1 rounded-full shadow-md">
                      {cat.count}
                    </span>
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
