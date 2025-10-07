"use client";

import { useEffect, useState } from "react";

/**
 * Renders children only when localStorage("cookie-consent") === "accepted".
 * Otherwise shows a friendly placeholder with “Accept cookies” button.
 */
export default function ConsentGate({
  children,
  label = "This content requires optional cookies (YouTube/Spotify/embeds).",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const [consent, setConsent] = useState<string | null>(null);

  useEffect(() => {
    setConsent(localStorage.getItem("cookie-consent"));
    function onChange(e: Event) {
      const detail = (e as CustomEvent).detail;
      setConsent(detail || localStorage.getItem("cookie-consent"));
    }
    window.addEventListener("cookie-consent", onChange as EventListener);
    return () => window.removeEventListener("cookie-consent", onChange as EventListener);
  }, []);

  if (consent === "accepted") return <>{children}</>;

  return (
    <div className="card p-4 text-sm">
      <p>{label}</p>
      <div className="mt-2 flex gap-2">
        <button
          className="btn bg-[var(--lis-ocean)] text-white border-transparent"
          onClick={() => {
            localStorage.setItem("cookie-consent", "accepted");
            window.dispatchEvent(new CustomEvent("cookie-consent", { detail: "accepted" }));
          }}
        >
          Accept & load
        </button>
        <button
          className="btn"
          onClick={() => {
            localStorage.setItem("cookie-consent", "rejected");
            window.dispatchEvent(new CustomEvent("cookie-consent", { detail: "rejected" }));
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
