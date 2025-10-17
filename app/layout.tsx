import "./globals.css";
import Link from "next/link";
import { Metadata } from "next";
import fs from "fs";

export const metadata: Metadata = {
  title: "Lisbon Events – Events & Eats",
  description:
    "Discover concerts, food festivals, art shows, and the best things to do in Lisbon.",
};

// --- Force include public/images during Vercel build ---
if (typeof window === "undefined") {
  try {
    fs.readdirSync("./public/images");
    console.log("✅ Included public/images for Vercel static export");
  } catch (err) {
    console.warn("⚠️ Could not read public/images:", err);
  }
}
// -------------------------------------------------------

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-[#fff8f2] text-[#40210f]">
        {/* ──────── Hero Banner (Top Section) ──────── */}
        <header className="relative w-full">
          <div
            className="relative h-[180px] bg-cover bg-center"
            style={{
              backgroundImage: "url('/images/hero-lisbon.jpg')",
            }}
          >
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center text-white px-4">
              <h1 className="text-3xl font-bold mb-1 drop-shadow-lg">
                Lisbon Events
              </h1>
              <p className="text-base drop-shadow-md mb-3">
                Discover concerts, food festivals, art shows, and more.
              </p>

              {/* Navigation Bar */}
              <nav className="flex flex-wrap justify-center gap-2">
                {[
                  { name: "Featured", href: "/featured" },
                  { name: "Discover", href: "/discover" },
                  { name: "Calendar", href: "/calendar" },
                  { name: "Events", href: "/events" },
                  { name: "Categories", href: "/categories" },
                  { name: "Submit", href: "/submit" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="bg-white text-[#40210f] px-3 py-1.5 rounded-full font-semibold hover:bg-orange-100 transition"
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </header>

        {/* ──────── Main Page Content ──────── */}
        <main className="max-w-6xl mx-auto px-4 py-8 flex-1">{children}</main>

        {/* ──────── Tan Tile Footer (Bottom Section) ──────── */}
        <footer className="mt-12">
          <div className="relative">
            {/* 🔸 Fallback: tile-lisbon or event image */}
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "url('/images/tile-lisbon.jpg'), url('/event-images/GmailLisboaEvents0510202519102025/unnamed(1).jpg')",
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
                    <li><Link href="/featured">Featured</Link></li>
                    <li><Link href="/discover">Discover</Link></li>
                    <li><Link href="/calendar">Calendar</Link></li>
                    <li><Link href="/events">Events</Link></li>
                    <li><Link href="/categories">Categories</Link></li>
                    <li><Link href="/submit">Submit an Event</Link></li>
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
