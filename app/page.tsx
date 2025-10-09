"use client";

import React from "react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f]">
      {/* Intro Section */}
      <section className="max-w-5xl mx-auto py-16 px-6 text-center">
        <h2 className="text-3xl font-semibold mb-3">What’s on in Lisbon</h2>
        <p className="text-gray-700 mb-6 text-lg">
          Discover concerts, food festivals, markets, and more. Share your event
          in minutes.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/events"
            className="bg-orange-100 text-[#40210f] px-6 py-2 rounded-full font-semibold hover:bg-orange-200 transition"
          >
            Browse Events
          </Link>
          <Link
            href="/submit"
            className="bg-orange-100 text-[#40210f] px-6 py-2 rounded-full font-semibold hover:bg-orange-200 transition"
          >
            Submit an Event
          </Link>
        </div>
      </section>

      {/* Ad Slot placeholder */}
      <div className="max-w-4xl mx-auto my-10 text-center border-t border-b border-orange-200 py-3 text-gray-500 uppercase tracking-wide text-sm">
        Advertisement — Ad Slot: home-top
      </div>
    </main>
  );
}
