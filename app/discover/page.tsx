"use client";

import React from "react";
import Link from "next/link";

export default function DiscoverPage() {
  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f]">
      <section className="max-w-5xl mx-auto py-16 px-6 text-center">
        <h2 className="text-3xl font-semibold mb-3">Discover Lisbon’s Best</h2>
        <p className="text-gray-700 mb-6 text-lg">
          Whether you’re a local or a traveler, Lisbon always has something new
          to offer — from hidden-gem cafés and weekend markets to open-air concerts
          and art exhibitions. Start exploring today.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/featured"
            className="bg-orange-100 text-[#40210f] px-6 py-2 rounded-full font-semibold hover:bg-orange-200 transition"
          >
            Today’s Highlights
          </Link>
          <Link
            href="/events"
            className="bg-orange-100 text-[#40210f] px-6 py-2 rounded-full font-semibold hover:bg-orange-200 transition"
          >
            Browse All Events
          </Link>
          <Link
            href="/submit"
            className="bg-orange-100 text-[#40210f] px-6 py-2 rounded-full font-semibold hover:bg-orange-200 transition"
          >
            Submit an Event
          </Link>
        </div>
      </section>

      <div className="max-w-4xl mx-auto my-10 text-center border-t border-b border-orange-200 py-3 text-gray-500 uppercase tracking-wide text-sm">
        Advertisement — Ad Slot: discover-page
      </div>

      <section className="max-w-5xl mx-auto py-8 px-6 text-center text-gray-700">
        <h3 className="text-2xl font-semibold mb-4">Why Lisbon?</h3>
        <p className="mb-4">
          Lisbon is Europe’s sunniest capital, known for its music, markets,
          and magnetic charm. Our event listings bring the city’s pulse together
          — so you can catch what’s happening around every corner.
        </p>
        <p>
          Check back often — we update daily with concerts, cultural festivals,
          local art pop-ups, and family-friendly gatherings across the city.
        </p>
      </section>
    </main>
  );
}
