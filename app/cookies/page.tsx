"use client";

import React from "react";
import Link from "next/link";

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg border border-orange-200 p-8">
        <h1 className="text-3xl font-bold mb-6 text-[#c94917]">
          Cookie Policy
        </h1>

        <p className="mb-4">
          This Cookie Policy explains how <strong>Lisbon 360</strong> uses
          cookies and similar technologies to improve your browsing experience,
          provide essential site functionality, and analyze traffic.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          1. What Are Cookies?
        </h2>
        <p className="mb-4">
          Cookies are small text files that are placed on your device when you
          visit a website. They help remember your preferences, support basic
          site features, and collect anonymous data about how you use the site.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          2. Types of Cookies We Use
        </h2>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>
            <strong>Essential cookies:</strong> Required for the site to
            function properly (e.g., navigation, security, forms).
          </li>
          <li>
            <strong>Analytics cookies:</strong> Help us understand visitor
            behavior so we can improve our content and usability.
          </li>
          <li>
            <strong>Functional cookies:</strong> Enable embedded media and
            integrations like Microlink previews or Google Maps.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          3. Managing Cookies
        </h2>
        <p className="mb-4">
          You can choose to accept or reject cookies when you first visit the
          site, or change your preferences later by clearing your cookie
          settings. To withdraw consent, click the button below:
        </p>
        <button
          onClick={() => {
            localStorage.removeItem("CookieConsent");
            document.cookie =
              "CookieConsent=false; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.reload();
          }}
          className="mt-2 px-4 py-2 bg-[#c94917] text-white rounded-lg hover:bg-[#a53f12]"
        >
          Withdraw Consent
        </button>

        <h2 className="text-xl font-semibold mt-6 mb-2">4. Third-Party Tools</h2>
        <p className="mb-4">
          We use third-party services such as <strong>Google Analytics</strong>{" "}
          and <strong>Microlink</strong> for analytics and preview generation.
          These tools may set their own cookies in accordance with their privacy
          policies.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">5. Updates</h2>
        <p className="mb-4">
          This Cookie Policy may be updated periodically to reflect changes in
          our practices or legal requirements. Please check this page from time
          to time for updates.
        </p>

        <p className="text-sm text-gray-500 mt-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="text-center mt-10">
          <Link
            href="/privacy"
            className="inline-block px-4 py-2 border border-[#c94917] text-[#c94917] rounded-lg hover:bg-orange-50 mr-2"
          >
            View Privacy Policy
          </Link>
          <Link
            href="/"
            className="inline-block px-4 py-2 border border-[#c94917] text-[#c94917] rounded-lg hover:bg-orange-50"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
