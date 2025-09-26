"use client";

import { useEffect, useState } from "react";

/**
 * Stores consent in localStorage as "accepted" | "rejected".
 * Dispatches a "cookie-consent" CustomEvent whenever the value changes.
 */
export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("cookie-consent");
    if (!stored) setShow(true);
    else setChoice(stored);
  }, []);

  useEffect(() => {
    if (choice === "accepted") {
      // Load GA only if we have an ID and only after consent
      const gaId = process.env.NEXT_PUBLIC_GA_ID;
      if (gaId) {
        // gtag loader
        const s1 = document.createElement("script");
        s1.async = true;
        s1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        document.head.appendChild(s1);

        // gtag config
        const s2 = document.createElement("script");
        s2.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { anonymize_ip: true });
        `;
        document.head.appendChild(s2);
      }
    }
  }, [choice]);

  function setConsent(v: "accepted" | "rejected") {
    localStorage.setItem("cookie-consent", v);
    setChoice(v);
    setShow(false);
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: v }));
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg">
      <div className="max-w-5xl mx-auto p-4">
        <p className="text-sm">
          We use optional cookies for analytics and to display third-party media (YouTube/Spotify).
          You can accept or reject now, and change your mind anytime in “Manage Cookies”.
          Read our <a href="/privacy" className="underline">Privacy & Cookie Policy</a>.
        </p>
        <div className="mt-3 flex gap-2">
          <button className="btn" onClick={() => setConsent("rejected")}>Reject</button>
          <button className="btn bg-[var(--lis-ocean)] text-white border-transparent" onClick={() => setConsent("accepted")}>Accept</button>
        </div>
      </div>
    </div>
  );
}
