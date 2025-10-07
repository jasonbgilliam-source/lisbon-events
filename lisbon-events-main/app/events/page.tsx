"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Microlink from "@microlink/react";
import dayjs from "dayjs";

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

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

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

        const uniqueCats = Array.from(
          new Set(data.map((e) => e.category).filter(Boolean))
        );
        setCategories(uniqueCats);
      } catch (err) {
        console.error("Error loading events:", err);
      }
    }

    loadCSV();
  }, []);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    if (cat === "All") {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter((e) => e.category === cat));
    }
  };

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f]">
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6 text-[#c94917]">All Events</h1>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => handleCategoryChange("All")}
            className={`px-3 py-1 rounded-full border ${
              selectedCategory === "All"
                ? "bg-[#c94917] text-white"
                : "bg-white border-[#c94917] text-[#c94917] hover:bg-orange-50"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-3 py-1 rounded-full border ${
                selectedCategory === cat
                  ? "bg-[#c94917] text-white"
                  : "bg-white border-[#c94917] text-[#c94917] hover:bg-orange-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Event Cards */}
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
            No events found in this category.
          </p>
        )}
      </section>
    </main>
  );
}
