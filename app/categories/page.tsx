"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Microlink from "@microlink/react";

type Category = { name: string; sampleUrl?: string };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/events.csv", { cache: "no-store" });
        const text = await res.text();

        // skip empty or header lines
        const rows = text.split("\n").filter((line) => line.trim() !== "");
        const parsed = rows
          .slice(1)
          .map((r) => r.split(","))
          .filter((cols) => cols.length > 9)
          .map((cols) => ({
            name: cols[9]?.trim(),
            sampleUrl: cols[12]?.trim(),
          }))
          .filter((e) => e.name && e.name !== "");

        // unique by name (case-insensitive)
        const uniqueCategories = Array.from(
          new Map(parsed.map((c) => [c.name.toLowerCase(), c])).values()
        );

        setCategories(uniqueCategories);
      } catch (err) {
        console.error("Error loading categories:", err);
      }
    }

    fetchCategories();
  }, []);

  /** ✅ Validate URL safely */
  const isValidUrl = (url?: string) => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  /** ✅ Choose image or Microlink card */
  const getImageForCategory = (category: Category) => {
    if (isValidUrl(category.sampleUrl)) {
      return (
        <Microlink
          key={category.name}
          url={category.sampleUrl!}
          size="large"
          style={{ borderRadius: "1rem" }}
        />
      );
    }

    const categorySlug = category.name.toLowerCase().replace(/\s+/g, "-");
    return (
      <Image
        src={`/images/${categorySlug || "default"}.jpg`}
        alt={category.name}
        width={400}
        height={250}
        className="rounded-2xl object-cover w-full h-56"
      />
    );
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

        {/* ✅ Category grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((category) => {
            const slug = category.name.toLowerCase().replace(/\s+/g, "-");
            return (
              <Link
                key={slug}
                href={`/categories/${slug}`}
                className="bg-white shadow-md hover:shadow-xl rounded-2xl overflow-hidden border border-orange-200 transition transform hover:-translate-y-1"
              >
                <div className="relative">{getImageForCategory(category)}</div>
                <div className="p-5">
                  <h2 className="text-2xl font-semibold mb-1">
                    {category.name}
                  </h2>
                  <p className="text-sm text-gray-600">Discover local events</p>
                </div>
              </Link>
            );
          })}
        </div>

        {categories.length === 0 && (
          <p className="text-center mt-10 text-gray-600 italic">
            No categories found yet.
          </p>
        )}
      </section>
    </main>
  );
}
