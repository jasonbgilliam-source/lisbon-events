"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import FilterBar from "@/components/FilterBar";

export const dynamic = "force-dynamic";

// ✅ Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type CategoryData = {
  name: string;
  count: number;
};

// Normalize helper (case + accent insensitive)
const normalize = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

// ✅ Safe parser for JSON or text arrays
function parseCategories(value: any): string[] {
  if (!value) return [];
  try {
    // JSON array like ["Music","Theater"]
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v).trim());
    }
  } catch {
    // Postgres array-like string {Music,Theater}
    if (typeof value === "string") {
      return value
        .replace(/[{}[\]"]/g, "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);

        // 1️⃣ Fetch all approved events
        const { data: events, error: eventError } = await supabase
          .from("event_submissions")
          .select("categories, status")
          .eq("status", "approved");

        if (eventError) throw eventError;

        // 2️⃣ Fetch master category catalog
        const { data: catalog, error: catError } = await supabase
          .from("category_catalog")
          .select("name")
          .order("name", { ascending: true });

        if (catError) throw catError;

        const validCategories = (catalog || []).map((c) => c.name.trim());
        const normalizedCatalog = validCategories.map(normalize);

        // 3️⃣ Count events per category
        const counts: Record<string, number> = {};

        (events || []).forEach((e: any) => {
          const parsedCats = parseCategories(e.categories);
          parsedCats.forEach((cat) => {
            const norm = normalize(cat);
            const idx = normalizedCatalog.indexOf(norm);
            const catName =
              idx >= 0
                ? validCategories[idx]
                : validCategories.find((valid) => normalize(valid) === norm) ||
                  "Other";
            counts[catName] = (counts[catName] || 0) + 1;
          });
        });

        // 4️⃣ Merge results (include categories with count = 0)
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

              // Handle .jpeg/.jpg fallback automatically
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
