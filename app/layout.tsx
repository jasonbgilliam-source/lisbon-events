import "./globals.css";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lisbon Events – Events & Eats",
  description:
    "Discover concerts, food festivals, art shows, and the best things to do in Lisbon.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-[#f8f3e7] text-gray-800">
        <header className="relative w-full">
          <div className="relative">
            <img
              src="/hero-lisbon.jpg"
              alt="Lisbon cityscape"
              className="w-full h-[400px] object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center text-center text-white px-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
                Lisbon Events
              </h1>
              <p className="text-lg md:text-xl mb-6">
                Discover concerts, food festivals, art shows, and more.
              </p>
              <nav className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/calendar"
                  className="nav-btn bg-white text-gray-800 hover:bg-gray-100"
                >
                  Calendar
                </Link>
                <Link
                  href="/events"
                  className="nav-btn bg-white text-gray-800 hover:bg-gray-100"
                >
                  Events
                </Link>
                <Link
                  href="/categories"
                  className="nav-btn bg-white text-gray-800 hover:bg-gray-100"
                >
                  Categories
                </Link>
                <Link
                  href="/add"
                  className="nav-btn bg-blue-600 text-white hover:bg-blue-700"
                >
                  Submit
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-12">{children}</main>

        <footer className="bg-[#f0e5d4] py-8 mt-12 border-t border-gray-300">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-center md:text-left">
            <div>
              <h3 className="font-bold mb-2 text-lg">Lisbon Events</h3>
              <p className="text-sm">
                Curated happenings across the city. Filter by category, city, and date.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-lg">Explore</h3>
              <ul className="space-y-1 text-sm">
                <li><Link href="/calendar">Calendar</Link></li>
                <li><Link href="/events">Events</Link></li>
                <li><Link href="/categories">Categories</Link></li>
                <li><Link href="/add">Submit an event</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-lg">Made in Lisbon</h3>
              <p className="text-sm">
                Inspired by azulejos, tram 28, and pastel de nata energy.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
