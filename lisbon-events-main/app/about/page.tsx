"use client";

import React from "react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg border border-orange-200 p-8">
        <h1 className="text-3xl font-bold mb-6 text-[#c94917]">
          About Lisbon 360
        </h1>

        <p className="mb-4 text-lg">
          <strong>Lisbon 360</strong> was created for everyone who loves the
          city’s rhythm — from lazy café mornings to late-night fado.  
          We gather the best of Lisbon’s **music, art, food, and community**
          events in one place, so you can explore what’s happening today or plan
          your next weekend adventure.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          Our Mission
        </h2>
        <p className="mb-4">
          We believe in connecting people through culture. Whether you’re a
          lifelong Lisboeta or a first-time visitor, Lisbon 360 helps you
          discover authentic experiences — concerts in small venues, art
          pop-ups, neighborhood festivals, and food events that locals actually
          attend.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          How It Works
        </h2>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Our team curates and verifies local event listings daily.</li>
          <li>
            Organizers can <Link href="/submit" className="text-[#c94917] underline">submit their own events</Link>.
          </li>
          <li>
            We combine official sources, community tips, and public calendars
            for accuracy and variety.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          Meet the People Behind It
        </h2>
        <p className="mb-4">
          Lisbon 360 is powered by a small group of locals, expats, and
          travelers who share a love for Portuguese culture — and a passion for
          pastel de nata.  
          <span className="italic"> Powered by Nata & Bica ☕️</span>
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          Contact Us
        </h2>
        <p className="mb-4">
          Have an event to share, a partnership idea, or just want to say
          “Olá”?  
          Reach us at{" "}
          <a
            href="mailto:info@lisbon360.com"
            className="text-[#c94917] hover:underline"
          >
            info@lisbon360.com
          </a>{" "}
          or connect on social media.
        </p>

        <div className="text-center mt-10">
          <Link
            href="/events"
            className="inline-block px-4 py-2 border border-[#c94917] text-[#c94917] rounded-lg hover:bg-orange-50 mr-2"
          >
            Browse Events
          </Link>
          <Link
            href="/"
            className="inline-block px-4 py-2 border border-[#c94917] text-[#c94917] rounded-lg hover:bg-orange-50"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
