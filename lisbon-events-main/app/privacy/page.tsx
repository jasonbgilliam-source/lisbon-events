"use client";

import React from "react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg border border-orange-200 p-8">
        <h1 className="text-3xl font-bold mb-6 text-[#c94917]">
          Privacy & Cookie Policy
        </h1>

        <p className="mb-4">
          Welcome to Lisbon 360. We respect your privacy and are committed to
          protecting your personal information. This page explains what data we
          collect, how we use it, and how you can control your preferences.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          1. Information We Collect
        </h2>
        <p className="mb-4">
          We collect anonymous usage data (such as pages visited) to help
          improve our content and user experience. If you submit an event, we
          collect the data you provide in the form for publishing purposes.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          2. Cookies and Analytics
        </h2>
        <p className="mb-4">
          We use cookies to enhance site functionality and measure engagement.
          Some cookies are essential for the site to operate, while others help
          us understand how visitors use the site.
        </p>
        <p className="mb-4">
          By consenting to cookies, you allow us to collect anonymous analytics
          data (via tools like Google Analytics) and display embedded media
          (such as YouTube or Microlink previews).
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          3. Managing Your Consent
        </h2>
        <p className="mb-4">
          You can change or withdraw your cookie consent at any time using the
          button below.
        </p>
        <button
          onClick={() => {
            localStorage.removeItem("CookieConsent");
            window.location.reload();
          }}
          className="mt-2 px-4 py-2 bg-[#c94917] text-white rounded-lg hover:bg-[#a53f12]"
        >
          Withdraw Consent
        </button>

        <h2 className="text-xl font-semibold mt-6 mb-2">4. Contact</h2>
        <p className="mb-4">
          For any questions or data requests, please contact us at{" "}
          <a
            href="mailto:info@lisbon360.com"
            className="text-[#c94917] hover:underline"
          >
            info@lisbon360.com
          </a>
          .
        </p>

        <p className="text-sm text-gray-500 mt-8">
          Updated {new Date().toLocaleDateString()}.
        </p>

        <div className="text-center mt-10">
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

