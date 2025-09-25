import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Lisbon Events",
  description: "What’s on in Lisbon—events, music, food, arts, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* Top strip */}
        <div className="w-full h-1" style={{ background: "linear-gradient(90deg, var(--lis-ocean), var(--lis-tram))" }} />

        {/* Hero */}
        <header className="relative">
          <div className="relative h-56 md:h-72 lg:h-80 overflow-hidden">
            <img
              src="/images/hero-lisbon.jpg"
              alt="Lisbon"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(11,95,165,0.65)] via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white drop-shadow">Lisbon Events</h1>
                <p className="text-white/90 text-sm md:text-base">Discover concerts, food festivals, art shows, and more.</p>
              </div>
              <nav className="hidden md:flex gap-3">
                <Link className="btn bg-white/90 hover:bg-white" href="/calendar">Calendar</Link>
                <Link className="btn bg-white/90 hover:bg-white" href="/events">Events</Link>
                <Link className="btn bg-white/90 hover:bg-white" href="/submit">Submit</Link>
              </nav>
            </div>
          </div>
          {/* Tile underline */}
          <div className="h-2" style={{ backgroundImage: "linear-gradient(90deg, var(--lis-tile) 33%, transparent 0%)", backgroundSize: "16px 3px", backgroundRepeat: "repeat-x" }} />
        </header>

        {/* Main */}
        <main className="flex-1">{children}</main>

        {/* Footer with tiled texture */}
        <footer className="mt-12">
          <div className="relative">
            <div className="absolute inset-0 opacity-[0.08]" style={{
              backgroundImage: "url(/images/tiles-azulejo.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center"
            }} />
            <div className="relative">
              <div className="h-2" style={{ backgroundImage: "linear-gradient(90deg, var(--lis-terra) 33%, transparent 0%)", backgroundSize: "16px 3px", backgroundRepeat: "repeat-x" }} />
              <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="tile-rule text-lg font-semibold mb-2">Lisbon Events</div>
                    <p className="text-sm text-gray-700">Curated happenings across the city. Filter by category, city, and date.</p>
                  </div>
                  <div>
                    <div className="tile-rule text-lg font-semibold mb-2">Explore</div>
                    <ul className="space-y-1 text-sm">
                      <li><Link href="/calendar">Calendar</Link></li>
                      <li><Link href="/events">Events</Link></li>
                      <li><Link href="/submit">Submit an event</Link></li>
                    </ul>
                  </div>
                  <div>
                    <div className="tile-rule text-lg font-semibold mb-2">Made in Lisbon</div>
                    <p className="text-sm text-gray-700">Inspired by azulejos, tram 28, and pastel de nata energy.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center text-xs text-gray-500 py-4">© {new Date().getFullYear()} Lisbon Events</div>
        </footer>
      </body>
    </html>
  );
}
