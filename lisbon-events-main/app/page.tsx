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
      {/* Banner */}
      <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden">
        <img
          src="/images/lisbon-banner.jpg"
          alt="Lisbon skyline"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg">
            Lisbon Events
          </h1>
          <p className="text-lg md:text-xl drop-shadow">
            Discover concerts, food festivals, art shows, and more.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/categories"
              className="bg-[#b84b22] text-white px-4 py-2 rounded-full hover:bg-[#8a351a] transition"
            >
              Browse Events
            </Link>
            <Link
              href="/submit"
              className="bg-white/90 text-[#b84b22] px-4 py-2 rounded-full hover:bg-white transition"
            >
              Submit an Event
            </Link>
          </div>
        </div>
      </div>

      {/* Introduction */}
      <section className="text-center my-8 px-4">
        <h2 className="text-2xl font-semibold text-[#b84b22] mb-2">
          What’s on in Lisbon
        </h2>
        <p className="text-gray-700 max-w-2xl mx-auto">
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
              <h3 className="text-lg font-semibold text-[#b84b22] mb-1">
                {cat.name}
              </h3>
              <p className="text-sm text-gray-700">{cat.description}</p>
            </div>
          </Link>
        ))}
      </section>

      {/* Optional embeds (blog/calendar placeholders) */}
      <section className="px-4 mb-16">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Calendar Embed */}
          <div className="rounded-2xl overflow-hidden border border-[#f1e4d0] shadow-sm">
            <iframe
              src="https://calendar.google.com/calendar/embed?src=your_public_calendar_id&mode=AGENDA"
              className="w-full h-[600px]"
              style={{ border: 0 }}
            ></iframe>
          </div>

          {/* Blogger Embed */}
          <div className="rounded-2xl overflow-hidden border border-[#f1e4d0] shadow-sm">
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
