"use client";

import React from "react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f]">
      {/* Hero Banner */}
      <section
        className="relative bg-cover bg-center h-[400px]"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1505765050516-f72dcac9c60b?auto=format&fit=crop&w=1400&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-30" />
        <div className="relative z-10 flex flex-col justify-center items-center h-full text-center text-white px-4">
          <h1 className="text-5xl font-bold mb-3 drop-shadow-lg">
            Lisbon Events
          </h1>
          <p className="text-xl drop-shadow-md">
            Discover concerts, food festivals, art shows, and more.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link href="/calendar">
              <button className="bg-white text-[#40210f] px-5 py-2 rounded-full font-semibold hover:bg-orange-100 transition">
                Calendar
              </button>
            </Link>
            <Link href="/events">
              <button className="bg-white text-[#40210f] px-5 py-2 rounded-full font-semibold hover:bg-orange-100 transition">
                Events
              </button>
            </Link>
            <Link href="/categories">
              <button className="bg-white text-[#40210f] px-5 py-2 rounded-full font-semibold hover:bg-orange-100 transition">
                Categories
              </button>
            </Link>
            <Link href="/submit">
              <button className="bg-white text-[#40210f] px-5 py-2 rounded-full font-semibold hover:bg-orange-100 transition">
                Submit
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Intro Section */}
      <section className="max-w-5xl mx-auto py-10 px-6 text-center">
        <h2 className="text-2xl font-semibold mb-3">What’s on in Lisbon</h2>
        <p className="text-gray-700 mb-6">
          Discover concerts, food festivals, markets and more. Share your event
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
      <div className="max-w-4xl mx-auto my-8 text-center border-t border-b border-orange-200 py-3 text-gray-500 uppercase tracking-wide text-sm">
        Advertisement — Ad Slot: home-top
      </div>
    </main>
  );
}

