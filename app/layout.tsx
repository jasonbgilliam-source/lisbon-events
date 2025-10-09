import "./globals.css";
import Link from "next/link";
import { Metadata } from "next";
import Footer from "@/components/Footer";

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
      <body className="font-sans bg-[#fff8f2] text-[#40210f]">
        {/* Hero Banner */}
        <header className="relative w-full">
          <div
            className="relative h-[400px] bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1505765050516-f72dcac9c60b?auto=format&fit=crop&w=1400&q=80')",
            }}
          >
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center text-white px-4">
              <h1 className="text-5xl font-bold mb-3 drop-shadow-lg">
                Lisbon Events
              </h1>
              <p className="text-xl drop-shadow-md mb-6">
                Discover concerts, food festivals, art shows, and more.
              </p>
              <nav className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/calendar"
                  className="bg-white text-[#40210f] px-5 py-2 rounded-full font-semibold hover:bg-orange-100 transition"
                >
                  Calendar
                </Link>
                <Link
                  href="/events"
                  className="bg-white text-[#40210f] px-5 py-2 rounded-full font-semibold hover:bg-orange-100 transition"
                >
                  Events
                </Link>
                <Link
                  href="/categories"
                  className="bg-white text-[#40210f] px-5 py-2 rounded-full font-semibold hover:bg-orange-100 transition"
                >
                  Categories
                </Link>
                <Link
                  href="/submit"
                  className="bg-white text-[#40210f] px-5 py-2 rounded-full font-semibold hover:bg-orange-100 transition"
                >
                  Submit
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="max-w-6xl mx-auto px-4 py-12">{children}</main>

        {/* Footer Component */}
        <Footer />
      </body>
    </html>
  );
}
