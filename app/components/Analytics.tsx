"use client";

import { useEffect } from "react";

/**
 * On first paint, if consent already accepted, load GA.
 * (CookieConsent also loads GA when the user accepts within the current session.)
 */
export default function Analytics() {
  useEffect(() => {
    const choice = localStorage.getItem("cookie-consent");
    if (choice !== "accepted") return;

    const gaId = process.env.NEXT_PUBLIC_GA_ID;
    if (!gaId) return;

    const s1 = document.createElement("script");
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(s1);

    const s2 = document.createElement("script");
    s2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', { anonymize_ip: true });
    `;
    document.head.appendChild(s2);
  }, []);

  return null;
}
