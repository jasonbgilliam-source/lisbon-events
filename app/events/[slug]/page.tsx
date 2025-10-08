"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

export default function EventDetailPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    async function fetchEvent() {
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

        // ✅ normalize slug type
        const slugStr = Array.isArray(slug) ? slug[0] : slug || "";

        // Match event by slug (title lowercased with hyphens)
        const found = data.find(
          (e) =>
            e.title?.toLowerCase().replace(/\s+/g, "-") ===
            decodeURIComponent(slugStr)
        );

        if (found) setEvent(found);
      } catch (err) {
        console.error("Error loading event:", err);
      }
    }
    fetchEvent();
  }, [slug]);

  if (!event)
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#fff8f2]">
        <p className="text-gray-600 italic">Loading event...</p>
      </main>
    );

  const formattedDate = event.end
    ? `${dayjs(event.start).format("MMM D")}–${dayjs(event.end).format("MMM D, YYYY")}`
    : dayjs(event.start).format("MMMM D, YYYY");

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg border border-orange-200 overflow-hidden">
        <div className="bg-[#f9e0d0] px-6 py-4 border-b border-orange-300">
          <h1 className="text-3xl font-bold mb-1">{event.title}</h1>
          <p className="text-[#b85c2a] text-sm">{event.category}</p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm font-semibold text-[#c94917]">{formattedDate}</p>

          {event.venue && (
            <p className="text-base">
              📍 {event.venue}
              {event.city && `, ${event.city}`}
            </p>
          )}
          {event.address && <p className="text-sm text-gray-700">{event.address}</p>}

          {event.description && (
            <p className="text-gray-800 leading-relaxed">{event.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm mt-4">
            {event.price && (
              <span className="px-3 py-1 bg-orange-50 border border-orange-200 rounded-lg">
                💶 {event.price}
              </span>
            )}
            {event.age && (
              <span className="px-3 py-1 bg-orange-50 border border-orange-200 rounded-lg">
                👶 {event.age}
              </span>
            )}
            {event.organizer && (
              <span className="px-3 py-1 bg-orange-50 border border-orange-200 rounded-lg">
                🏛 {event.organizer}
              </span>
            )}
          </div>

          {/* Microlink snapshot */}
          {event.source_url ? (
            <div className="mt-6 border-t border-orange-200 pt-6">
              <h2 className="text-lg font-semibold mb-2">Event Link Preview</h2>
              <Microlink url={event.source_url} size="large" />
            </div>
          ) : (
            <div className="mt-6 border-t border-orange-200 pt-6 text-gray-600 italic">
              No external link available for this event.
            </div>
          )}
        </div>
      </div>

      <div className="text-center mt-8">
        <a
          href="/events"
          className="inline-block px-4 py-2 text-[#c94917] border border-[#c94917] rounded-lg hover:bg-orange-50"
        >
          ← Back to Events
        </a>
      </div>
    </main>
  );
}
