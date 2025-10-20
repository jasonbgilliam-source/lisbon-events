"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import EventCard from "@/components/EventCard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CategoryPage() {
  const { slug } = useParams();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategoryEvents() {
      setLoading(true);

      let data: any[] | null = null;
      let error: any = null;

      // Try a direct query — works if categories is an array column (text[])
      try {
        const { data: direct, error: err1 } = await supabase
          .from("event_submissions")
          .select("*")
          .eq("status", "approved")
          .contains("categories", [slug]); // Supabase supports array contains
        data = direct;
        error = err1;
      } catch {
        // fallback to next step
      }

      // If the above fails or returns empty, fall back to ilike
      if ((!data || data.length === 0) && !error) {
        const { data: fallback, error: err2 } = await supabase
          .from("event_submissions")
          .select("*")
          .eq("status", "approved")
          .ilike("categories", `%${slug}%`);
        data = fallback;
        error = err2;
      }

      if (!error && data) {
        // Final safeguard: normalize arrays if categories are in string form
        const filtered = data.filter((e) => {
          const cats =
            Array.isArray(e.categories)
              ? e.categories.map((c) => c.toLowerCase())
              : typeof e.categories === "string"
              ? e.categories
                  .replace(/[{}"]/g, "")
                  .split(",")
                  .map((x) => x.trim().toLowerCase())
              : [];
          return cats.includes(slug.toLowerCase());
        });

        setEvents(filtered);
      }
      setLoading(false);
    }

    loadCategoryEvents();
  }, [slug]);

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <section className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center text-[#c94917] capitalize">
          {slug.replace(/-/g, " ")} Events in Lisbon
        </h1>

        {loading ? (
          <p className="text-center text-gray-600 mt-10">Loading events…</p>
        ) : events.length === 0 ? (
          <p className="text-center text-gray-600 italic mt-10">
            No events found for this category.
          </p>
        ) : (
          <div className="flex flex-col gap-6 mt-8">
            {events.map((event) => (
              <EventCard key={event.id} e={event} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
