"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Microlink from "@microlink/react";
import dayjs from "dayjs";
import { createClient } from "@supabase/supabase-js";

type EventItem = {
  title: string;
  start: string;
  end?: string;
  venue?: string;
  city?: string;
  address?: string;
  price?: string;
  age?: string;
  category?: string;
  description?: string;
  organizer?: string;
  source_url?: string;
};

// ✅ Supabase init
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceBuckets, setPriceBuckets] = useState<string[]>([]);
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);

  // 🧠 Helper: categorize price into buckets
  function getPriceBucket(price: string | undefined): string {
    if (!price || price.toLowerCase() === "unknown") return "Unknown";

    const lower = price.toLowerCase();
    if (lower.includes("free") || lower.includes("grátis") || lower.includes("0")) {
      return "Free";
    }

    const match = lower.match(/\d+/g);
    if (match) {
      const nums = match.map(Number);
      const min = Math.min(...nums);
      if (min === 0) return "Free";
      if (min <= 15) return "Under €15";
      if (min >= 30 && min <= 100) return "€30–100";
    }

    return "Other";
  }

  // 🟡 Load events from CSV
  useEffect(() => {
    async function loadCSV() {
      try {
        const res = await fetch("/events.csv");
        const text = await res.text();
        const lines = text.split("\n").filter((l) => l.trim() !== "");
        const headers = lines[0].split(",").map((h) => h.trim());
        const data = lines.slice(1).map((line) => {
          const cols = line.split(",");
          return headers.reduce((acc: any, key, i) => {
            acc[key] = cols[i]?.trim();
            return acc;
          }, {});
        });

        setEvents(data);
        setFilteredEvents(data);

        // 🟢 Unique Price Buckets
        const uniquePrices = Array.from(
          new Set(
            data
              .map((e) => getPriceBucket(e.price))
              .filter((bucket) => bucket && bucket !== "")
          )
        );
        setPriceBuckets(uniquePrices);
      } catch (err) {
        console.error("Error loading events:", err);
      }
    }

    loadCSV();
  }, []);

  // 🟠 Load categories from Supabase category_catalog
  useEffect(() => {
    async function loadCategories() {
      try {
        const { data, error } = await supabase
          .from("category_catalog")
          .select("name");

        if (error) throw error;

        const sortedNames = (data || [])
          .map((c) => c.name)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));

        setCategories(sortedNames);
      } catch (err) {
        console.error("Error loading category catalog:", err);
      }
    }

    loadCategories();
  }, []);

  // 🧠 Apply filters whenever selections change
  useEffect(() => {
    console.log("🧠 Selected categories:", selectedCategories);
    console.log(
      "🧠 Sample event categories:",
      events.slice(0, 10).map((e) => e.category)
    );

    const filtered = events.filter((e) => {
      const normalizedEventCat = e.category?.toLowerCase().trim();
      const normalizedSelected = selectedCategories.map((c) =>
        c.toLowerCase().trim()
      );

      const categoryMatch =
        selectedCategories.length === 0 ||
        (normalizedEventCat && normalizedSelected.includes(normalizedEventCat));

      const priceBucket = getPriceBucket(e.price);
      const priceMatch =
        selectedPrices.length === 0 || selectedPrices.includes(priceBucket);

      return categoryMatch && priceMatch;
    });

    console.log("✅ Filtered events count:", filtered.length);

    setFilteredEvents(filtered);
  }, [selectedCategories, selectedPrices, events]);

  // 🛠️ Handlers
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const togglePrice = (bucket: string) => {
    setSelectedPrices((prev) =>
      prev.includes(bucket) ? prev.filter((p) => p !== bucket) : [...prev, bucket]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedPrices([]);
  };

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f]">
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6 text-[#c94917]">All Events</h1>

        {/* 🟠 Sticky Filter Toolbar */}
        <div className="sticky top-0 z-10 bg-[#fff8f2] py-4 mb-8 border-b border-orange-200 shadow-sm">
          <div className="space-y-4 max-w-6xl mx-auto">
            {/* Category Filter */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Filter by Category</h2>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1 rounded-full border transition ${
                      selectedCategories.includes(cat)
                        ? "bg-[#c94917] text-white border-[#c94917]"
                        : "bg-white text-[#c94917] border-[#c94917] hover:bg-orange-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Filter by Price</h2>
              <div className="flex flex-wrap gap-2">
                {priceBuckets.map((bucket) => (
                  <button
                    key={bucket}
                    onClick={() => togglePrice(bucket)}
                    className={`px-3 py-1 rounded-full border transition ${
                      selectedPrices.includes(bucket)
                        ? "bg-[#c94917] text-white border-[#c94917]"
                        : "bg-white text-[#c94917] border-[#c94917] hover:bg-orange-50"
                    }`}
                  >
                    {bucket}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {(selectedCategories.length > 0 || selectedPrices.length > 0) && (
              <div>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-200 rounded-full text-sm hover:bg-gray-300"
                >
                  Clear Filters ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 🟡 Event Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event, i) => {
            const eventSlug = event.title
              ?.toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, "");

            const hasURL = Boolean(event.source_url);
            const fallbackImg = `/images/${(event.category || "default")
              .toLowerCase()
              .replace(/\s+/g, "-")}.jpg`;

            return (
              <Link
                href={`/events/${eventSlug}`}
                key={i}
                className="bg-white rounded-2xl shadow-md border border-orange-200 overflow-hidden hover:shadow-lg transition"
              >
                <div className="h-48 w-full overflow-hidden">
                  {hasURL ? (
                    <Microlink
                      url={event.source_url!}
                      size="large"
                      media="image"
                      style={{ border: "none", width: "100%", height: "100%" }}
                    />
                  ) : (
                    <img
                      src={fallbackImg}
                      alt={event.title}
                      className="object-cover w-full h-full"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).src = "/images/default.jpg")
                      }
                    />
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h2 className="text-xl font-semibold">{event.title}</h2>
                  <p className="text-sm text-gray-700">
                    {dayjs(event.start).format("MMM D")}
                    {event.end
                      ? ` – ${dayjs(event.end).format("MMM D, YYYY")}`
                      : ""}
                  </p>
                  {event.venue && (
                    <p className="text-sm text-gray-600">{event.venue}</p>
                  )}
                  <p className="text-sm text-[#c94917] font-medium">
                    {event.category}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {filteredEvents.length === 0 && (
          <p className="text-center text-gray-600 italic mt-10">
            No events found matching your filters.
          </p>
        )}
      </section>
    </main>
  );
}
