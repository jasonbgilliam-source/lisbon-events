"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import EventCard from "@/components/EventCard";

export const dynamic = "force-dynamic";

// ✅ Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Normalize function for accents and case
const normalize = (str: string) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export default function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const category = decodeURIComponent(params.category);

  useEffect(() => {
    async function loadCategoryEvents() {
      try {
        setLoading(true);

        // ✅ Match events where category is included in array
        const { data, error } = await supabase
          .from("event_submissions")
          .select("*")
          .eq("status", "approved")
          .contains("categories", [category]);

        if (error) throw error;

        // Optional fallback: handle accent or case mismatches
        if (!data || data.length === 0) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("event_submissions")
            .select("*")
            .eq("status", "approved");

          if (fallbackError) throw fallbackError;

          const normalizedCategory = normalize(category);
          const filtered = (fallbackData || []).filter((event: any) =>
            (event.categories || []).some(
              (cat: string) => normalize(cat) === normalizedCategory
            )
          );

          setEvents(filtered);
        } else {
          setEvents(data);
        }
      } catch (err) {
        console.error("Error loading category events:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCategoryEvents();
  }, [category]);

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f]">
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold mb-6 text-[#c94917] text-center capitalize">
          {category} Events
        </h1>

        {loading ? (
          <p className="text-center text-gray-600 italic">Loading events…</p>
        ) : events.length === 0 ? (
          <p className="text-center mt-10 text-gray-600 italic">
            No events found for this category.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
