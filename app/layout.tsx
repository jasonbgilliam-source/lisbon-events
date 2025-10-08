// app/layout.tsx

import "./globals.css";
import Link from "next/link";
import { useEffect } from "react";
import CookieConsent, { getCookieConsentValue } from "react-cookie-consent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lisbon 360 – Events & Eats",
  description:
    "Discover the best events, concerts, food, and experiences across Lisbon.",
  metadataBase: new URL("https://lisbon-events-psi.vercel.app"),
  openGraph: {
    title: "Lisbon 360 – Events & Eats",
    description:
      "Find live music, art, food markets, and local events around Lisbon.",
    url: "https://lisbon-events-psi.vercel.app",
    siteName: "Lisbon 360",
    images: [
      {
        url: "/images/lisbon-skyline.jpg",
        width: 1200,
        height: 630,
        alt: "Lisbon skyline at sunset",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // --- Google Analytics initialization (after consent only) ---
  useEffect(() => {
    const consent = getCookieConsentValue("CookieConsent");
    if (consent === "true") {
      // Replace G-XXXXXXX with your actual GA ID once ready
      const script = document.createElement("script");
      script.src = "https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX";
      script.async = true;
      document.head.appendChild(script);

      const inlineScript = document.createElement("script");
      inlineScript.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-XXXXXXX');
      `;
      document.head.appendChild(inlineScript);
    }
  }, []);

  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 text-gray-900 flex flex-col font-sans">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/images/lisbon-tile-icon.png"
                alt="Lisbon 360"
                className="w-8 h-8"
              />
              <span className="text-xl font-semibold tracking-tight">
                Lisbon 360
              </span>
            </Link>

            <nav className="hidden md:flex gap-6 text-sm font-medium">
              <Link href="/calendar" className="hover:text-orange-600">
                Calendar
              </Link>
              <Link href="/events" className="hover:text-orange-600">
                Events
              </Link>
              <Link href="/categories" className="hover:text-orange-600">
                Categories
              </Link>
              <Link href="/submit" className="hover:text-orange-600">
                Submit
              </Link>
              <Link href="/about" className="hover:text-orange-600">
                About
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Artwork */}
        <section
          className="relative w-full h-64 md:h-80 bg-cover bg-center shadow-inner"
          style={{ backgroundImage: "url('/images/lisbon-bridge.jpg')" }}
        >
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center text-white px-6">
            <h1 className="text-3xl md:text-5xl font-bold mb-2">
              Discover Lisbon
            </h1>
            <p className="text-lg md:text-xl">
              Music • Food • Art • Culture • Community
            </p>
          </div>
        </section>

        {/* Main Content */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300 mt-12">
          <div className="max-w-6xl mx-auto px-6 py-8 grid md:grid-cols-3 gap-6">
            <div>
              <h2 className="font-semibold text-lg text-white mb-2">
                Lisbon 360
              </h2>
              <p className="text-sm text-gray-400">
                Connecting locals and travelers to Lisbon’s vibrant culture.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-lg text-white mb-2">Explore</h2>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link href="/calendar" className="hover:text-orange-400">
                    Calendar
                  </Link>
                </li>
                <li>
                  <Link href="/events" className="hover:text-orange-400">
                    Events
                  </Link>
                </li>
                <li>
                  <Link href="/categories" className="hover:text-orange-400">
                    Categories
                  </Link>
                </li>
                <li>
                  <Link href="/submit" className="hover:text-orange-400">
                    Submit an Event
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-semibold text-lg text-white mb-2">Legal</h2>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-orange-400">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="hover:text-orange-400">
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-orange-400">
                    About
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="text-center text-xs text-gray-500 border-t border-gray-700 py-4">
            © {new Date().getFullYear()} Lisbon 360. All rights reserved. <br />
            <span className="italic text-gray-400">
              Powered by Nata & Bica ☕️
            </span>
          </div>
        </footer>

        {/* EU Cookie Consent Banner */}
        <CookieConsent
          location="bottom"
          buttonText="Accept All"
          declineButtonText="Reject"
          enableDeclineButton
          cookieName="CookieConsent"
          style={{
            background: "#40210f",
            color: "white",
            fontSize: "14px",
            zIndex: 9999,
          }}
          buttonStyle={{
            background: "#c94917",
            color: "white",
            borderRadius: "8px",
            padding: "8px 14px",
          }}
          declineButtonStyle={{
            background: "#b85c2a",
            color: "white",
            borderRadius: "8px",
            padding: "8px 14px",
          }}
          expires={180}
        >
          🍪 We use cookies to improve your experience and gather anonymous
          analytics. Learn more in our{" "}
          <a
            href="/privacy"
            style={{ color: "#ffd5b8", textDecoration: "underline" }}
          >
            Privacy Policy
          </a>
          .
        </CookieConsent>
      </body>
    </html>
  );
}
