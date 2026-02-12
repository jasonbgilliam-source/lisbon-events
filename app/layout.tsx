import "leaflet/dist/leaflet.css";
import "./globals.css";
import type { Metadata } from "next";
import fs from "fs";
import { headers } from "next/headers";
import SiteHeader from "@/components/SiteHeader";
import { getCityFromHost, getTheme } from "@/lib/city";

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
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const city = getCityFromHost(host);
  const theme = getTheme(city);

  return (
    <html lang="en">
      <body
        className="font-sans"
        style={{ background: theme.bg, color: theme.text }}
      >
        <div className="min-h-screen flex flex-col">
          <SiteHeader city={city} theme={theme} />

          <main className="flex-1 max-w-6xl mx-auto px-4 py-8">
            {children}
          </main>

          <footer className="mt-12 border-t border-black/10">
            <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-black/60">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <div className="font-semibold" style={{ color: theme.accent }}>
                    {theme.brandName}
                  </div>
                  <div className="text-xs mt-1">
                    Curated happenings across the city — concerts, markets, exhibitions, and more.
                  </div>
                </div>
                <div className="text-xs">
                  © {new Date().getFullYear()} {theme.brandName}
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
