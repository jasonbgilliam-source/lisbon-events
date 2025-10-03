"use client";

import { ReactNode, useEffect, useState } from "react";

export default function ConsentGate({
  children,
  label,
  consent = "general", // default category of consent
}: {
  children: ReactNode;
  label?: string;
  consent?: string;
}) {
  const storageKey = `consent:${consent}`;
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      setHasConsent(stored === "true");
    }
  }, [storageKey]);

  function accept() {
    localStorage.setItem(storageKey, "true");
    setHasConsent(true);
  }

  function decline() {
    localStorage.setItem(storageKey, "false");
    setHasConsent(false);
  }

  if (hasConsent === null) {
    return <p className="text-gray-500 text-sm">Loading consent…</p>;
  }

  if (!hasConsent) {
    return (
      <div className="border rounded p-6 bg-yellow-50 text-gray-800 shadow-md">
        <h2 className="text-lg font-semibold mb-2">
          {label || "This content requires your consent"}
        </h2>
        <p className="mb-4">
          We use cookies or embed third-party content that requires your
          approval under EU law. Please accept to continue.
        </p>
        <div className="flex gap-4">
          <button
            onClick={accept}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Accept
          </button>
          <button
            onClick={decline}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  // ✅ User accepted — show gated content
  return <>{children}</>;
}
