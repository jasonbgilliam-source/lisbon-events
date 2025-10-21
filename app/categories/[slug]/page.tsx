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

      const activeSlug = Array.isArray(slug) ? slug[0].toLowerCase() : slug.toLowerCase();

      // --- Fetch all approved events first ---
      const { data, error } = await supabase
        .from("event_submissions")
        .select("*")
        .eq("status", "approved");

      if (error) {
        console.error("Error fetching events:", error);
        setLoading(false);
        return;
      }

      // --- Normalize + filter both category & categories ---
      const filtered = (data || []).filter((e) => {
        const cats: string[] = [];

        // Legacy single category field
        if (e.category && typeof e.category === "string") {
          cats.push(e.category.toLowerCase());
        }

        // New categories array or string field
        if (Array.isArray(e.categories)) {
          cats.push(...e.categories.map((c: string) => c.toLowerCase()));
        } else if (typeof e.categories === "string" && e.categories.trim() !== "") {
          try {
            // Handle Postgres array string or JSON-like text
            const parsed =
              e.categories.trim().startsWith("[")
                ? JSON.parse(e.categories)
                : e.categories
                    .replace(/[{}"]/g, "")
                    .split(",")
                    .map((x: string) => x.trim());
            cats.push(...parsed.map((c: string) => c.toLowerCase()));
          } catch {
            /* ignore parse error */
          }
        }

        return cats.includes(activeSlug);
      });

      setEvents(filtered);
      setLoading(false);
    }

    loadCategoryEvents();
  }, [slug]);

  const readableSlug = ((Array.isArray(slug) ? slug[0] : slug)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()));

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <section className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center text-[#c94917]">
          {readableSlug} Events in Lisbon
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
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
