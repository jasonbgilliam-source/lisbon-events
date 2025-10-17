"use client";

import "./globals.css";
import Link from "next/link";
import React from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-[#fff8f2] text-[#40210f]">
        {/* Header */}
        <header className="bg-[#fffaf5] border-b border-[#e6c5a1] shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between">
            <Link href="/" className="text-3xl font-bold text-[#c94917]">
              Lisbon Events
            </Link>

            <nav className="mt-3 sm:mt-0">
              <ul className="flex flex-wrap gap-5 text-sm font-medium text-[#40210f]">
                <li><Link href="/calendar" className="hover:text-[#c94917]">Calendar</Link></li>
                <li><Link href="/events" className="hover:text-[#c94917]">Events</Link></li>
                <li><Link href="/categories" className="hover:text-[#c94917]">Categories</Link></li>
                <li><Link href="/submit" className="hover:text-[#c94917]">Submit an event</Link></li>
              </ul>
            </nav>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1">{children}</main>

        {/* Footer with tiled texture */}
        <footer className="mt-12">
          <div className="relative">
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage: "url('/images/tile-lisbon.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 text-[#40210f]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
                <div>
                  <div className="text-lg font-semibold mb-2 text-[#c94917]">
                    Lisbon Events
                  </div>
                  <p className="text-sm text-gray-700">
                    Your curated guide to culture, art, and life in the city.
                    Discover what’s happening this week.
                  </p>
                </div>

                <div>
                  <div className="text-lg font-semibold mb-2 text-[#c94917]">
                    Quick Links
                  </div>
                  <ul className="space-y-1 text-sm">
                    <li><Link href="/calendar">Calendar</Link></li>
                    <li><Link href="/events">Events</Link></li>
                    <li><Link href="/categories">Categories</Link></li>
                    <li><Link href="/submit">Submit an event</Link></li>
                  </ul>
                </div>

                <div>
                  <div className="text-lg font-semibold mb-2 text-[#c94917]">
                    Made in Lisbon
                  </div>
                  <p className="text-sm text-gray-700">
                    Inspired by azulejos, tram 28, and pastel de nata energy.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500 py-4">
            © {new Date().getFullYear()} Lisbon Events
          </div>
        </footer>
      </body>
    </html>
  );
}
