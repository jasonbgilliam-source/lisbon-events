"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Microlink from "@microlink/react";

export default function CategoryPage() {
  const { slug } = useParams();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/events.csv");
        const text = await res.text();
        const rows = text.split("\n").slice(1);
        const parsed = rows
          .map((r) => {
            const cols = r.split(",");
            return {
              title: cols[0],
              start: cols[1],
              end: cols[2],
              venue: cols[4],
              city: cols[5],
              address: cols[6],
              price: cols[7],
              age: cols[8],
              category: cols[9],
              description: cols[10],
              organizer: cols[11],
              source_url: cols[12],
            };
          })
          .filter(
            (e) =>
              e.category?.toLowerCase().replace(/\s+/g, "-") ===
              (Array.isArray(slug) ? slug[0] : slug)
          );

        setEvents(parsed);
      } catch (err) {
        console.error("Error loading events:", err);
      }
    }
    fetchEvents();
  }, [slug]);

  const getImageForEvent = (event: any) => {
    if (event.source_url) {
      return (
        <Microlink
          url={event.source_url}
          size="large"
          style={{ borderRadius: "1rem" }}
        />
      );
    }
    const categorySlug = event.category?.toLowerCase().replace(/\s+/g, "-");
    return (
      <Image
        src={`/images/${categorySlug || "default"}.jpg`}
        alt={event.title}
        width={400}
        height={250}
        className="rounded-2xl object-cover w-full h-56"
      />
    );
  };

  // ✅ FIXED: normalize slug safely
  const slugStr = Array.isArray(slug) ? slug[0] : slug || "";
  const categoryName =
    slugStr.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "Category";

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f]">
      <section className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-6">
          {categoryName} Events
        </h1>
        <p className="text-center text-gray-600 mb-10">
          Discover {categoryName.toLowerCase()} happenings around Lisbon.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event, idx) => (
            <a
              key={idx}
              href={event.source_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white shadow-md hover:shadow-xl rounded-2xl overflow-hidden border border-orange-200 transition transform hover:-translate-y-1"
            >
              <div className="relative">{getImageForEvent(event)}</div>
              <div className="p-5">
                <h2 className="text-2xl font-semibold mb-1">{event.title}</h2>
                <p className="text-sm text-gray-600 mb-2">
                  {event.start} • {event.venue} • {event.city}
                </p>
                <p className="text-sm text-gray-800 line-clamp-3">
                  {event.description}
                </p>
                {event.price && (
                  <p className="mt-2 text-sm font-semibold text-orange-700">
                    {event.price}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>

        {events.length === 0 && (
          <p className="text-center mt-10 text-gray-600 italic">
            No events found for this category.
          </p>
        )}
      </section>
    </main>
  );
}
