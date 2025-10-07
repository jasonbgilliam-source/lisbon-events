"use client";

import React, { useState, useEffect } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    const savedConsent = localStorage.getItem("cookieConsent");
    if (!savedConsent) {
      setVisible(true);
    } else {
      setConsentGiven(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setConsentGiven(true);
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem("cookieConsent", "rejected");
    setVisible(false);
  };

  if (!visible || consentGiven) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 text-white p-4 sm:p-6 z-50 shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm leading-relaxed">
          🍪 This website uses cookies to improve your experience and analyze
          traffic. You can accept or reject analytics cookies.{" "}
          <a
            href="/privacy"
            className="underline hover:text-amber-400"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more
          </a>
          .
        </p>
        <div className="flex gap-2 mt-2 sm:mt-0">
          <button
            onClick={handleReject}
            className="bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded text-sm"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded text-sm font-semibold"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
