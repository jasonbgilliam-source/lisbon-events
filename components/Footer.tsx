"use client";

import React from "react";

export default function Footer() {
  return (
    <footer
      className="relative border-t border-orange-200 py-10 text-[#40210f]"
      style={{
        backgroundImage: "url('/images/tile-lisbon.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundBlendMode: "multiply",
        backgroundColor: "#f4e6cf", // warm tan tone overlay
      }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8 md:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 bg-[#fff8f2]/65 backdrop-blur-[1px] rounded-xl p-8 shadow-sm">
          <div>
            <h3 className="font-bold text-lg mb-2">Lisbon Events</h3>
            <p className="text-sm text-[#40210f]/85 leading-relaxed">
              Curated happenings across the city. Filter by category, city, and
              date.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-2">Explore</h3>
            <ul className="space-y-1 text-sm text-[#40210f]/85">
              <li>
                <a href="/calendar" className="hover:underline">
                  Calendar
                </a>
              </li>
              <li>
                <a href="/events" className="hover:underline">
                  Events
                </a>
              </li>
              <li>
                <a href="/categories" className="hover:underline">
                  Categories
                </a>
              </li>
              <li>
                <a href="/submit" className="hover:underline">
                  Submit an event
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-2">Made in Lisbon</h3>
            <p className="text-sm text-[#40210f]/85 leading-relaxed">
              Inspired by azulejos, tram 28, and pastel de nata energy.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
