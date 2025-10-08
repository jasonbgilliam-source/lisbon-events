import React from "react";
import Link from "next/link";
import LayoutWrapper from "@/components/LayoutWrapper";

const categories = [
  {
    name: "Music",
    slug: "music",
    description: "Concerts, jam sessions, fado, and live performances.",
    image: "/images/music.jpg",
  },
  {
    name: "Art & Exhibitions",
    slug: "art",
    description: "Gallery openings, street art, installations, and more.",
    image: "/images/art.jpg",
  },
  {
    name: "Food & Wine",
    slug: "food",
    description: "Markets, pop-ups, tastings, and foodie festivals.",
    image: "/images/food.jpg",
  },
  {
    name: "Film & Cinema",
    slug: "film",
    description: "Screenings, film fests, and open-air cinemas.",
    image: "/images/film.jpg",
  },
  {
    name: "Family & Community",
    slug: "family",
    description: "Workshops, fairs, and family-friendly happenings.",
    image: "/images/family.jpg",
  },
  {
    name: "Nightlife & Culture",
    slug: "nightlife",
    description: "Parties, DJ sets, theater, and cultural nights.",
    image: "/images/nightlife.jpg",
  },
];

export default function HomePage() {
  return (
    <LayoutWrapper>
      {/* Hero Banner */}
      <div className="relative w-full h-[400px] overflow-hidden">
        <img
          src="/hero-lisbon.jpg"
          alt="Lisbon cityscape"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg font-[Montserrat]">
            Lisbon Events
          </h1>
          <p className="text-lg md:text-xl drop-shadow font-[Open Sans]">
            Discover concerts, food festivals, art shows, and more.
          </p>
          <div className="mt-5 flex gap-3">
            <Link
              href="/categories"
              className="px-5 py-2 rounded-full bg-white text-gray-800 font-semibold hover:bg-gray-100 transition"
            >
              Browse Events
            </Link>
            <Link
              href="/add"
              className="px-5 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            >
              Submit an Event
            </Link>
          </div>
        </div>
      </div>

      {/* Introduction */}
      <section className="text-center my-10 px-4">
        <h2 className="text-2xl font-semibold text-[#b84b22] mb-2 font-[Montserrat]">
          What’s on in Lisbon
        </h2>
        <p className="text-gray-700 max-w-2xl mx-auto font-[Open Sans]">
          Curated happenings across the city — markets, concerts, festivals, and
          more. Filter by category, date, or vibe.
        </p>
      </section>

      {/* Category Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 pb-12 max-w-6xl mx-auto">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/categories/${cat.slug}`}
            className="group rounded-xl overflow-hidden border border-[#f1e4d0] bg-[#fffaf5] shadow hover:shadow-lg hover:-translate-y-1 transition"
          >
            <img
              src={cat.image}
              alt={cat.name}
              className="w-full h-48 object-cover group-hover:opacity-90"
            />
            <div className="p-4">
              <h3 className="text-lg font-semibold text-[#b84b22] mb-1 font-[Montserrat]">
                {cat.name}
              </h3>
              <p className="text-sm text-gray-700 font-[Open Sans]">
                {cat.description}
              </p>
            </div>
          </Link>
        ))}
      </section>

      {/* Optional Embeds (Calendar + Blog) */}
      <section className="px-4 mb-16">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Calendar Embed */}
          <div className="rounded-2xl overflow-hidden border border-[#f1e4d0] shadow-sm bg-white">
            <iframe
              src="https://calendar.google.com/calendar/embed?src=your_public_calendar_id&mode=AGENDA"
              className="w-full h-[600px]"
              style={{ border: 0 }}
            ></iframe>
          </div>

          {/* Blogger Embed */}
          <div className="rounded-2xl overflow-hidden border border-[#f1e4d0] shadow-sm bg-white">
            <iframe
              src="https://your-blogger-url.blogspot.com"
              className="w-full h-[800px]"
              style={{ border: 0 }}
            ></iframe>
          </div>
        </div>
      </section>
    </LayoutWrapper>
  );
}
