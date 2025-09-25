"use client";

import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [consent, setConsent] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("cookie-consent");
    if (!stored) setShow(true);
    else setConsent(stored);
  }, []);

  function handleChoice(choice: "accepted" | "rejected") {
    localStorage.setItem("cookie-consent", choice);
    setConsent(choice);
    setShow(false);
    if (choice === "accepted") {
      // load Google Analytics or other tracking
      const script = document.createElement("script");
      script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`;
      script.async = true;
      document.body.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      function gtag(){ (window as any).dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', process.env.NEXT_PUBLIC_GA_ID);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
      <p className="text-sm mb-3">
        We use cookies to improve your experience and analyze site traffic.
        You can accept or reject optional cookies.{" "}
        <a href="/privacy" className="underline">Learn more</a>.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => handleChoice("rejected")}
          className="px-4 py-2 border rounded"
        >
          Reject
        </button>
        <button
          onClick={() => handleChoice("accepted")}
          className="px-4 py-2 bg-[var(--lis-ocean)] text-white rounded"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
