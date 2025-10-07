"use client";

import { useEffect, useState } from "react";

export default function ConsentGate({
  children,
  label = "This content requires analytics consent.",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const [consent, setConsent] = useState<string | null>(null);

  useEffect(() => {
    const value = localStorage.getItem("cookie_consent");
    setConsent(value);
  }, []);

  if (consent === null)
    return <div className="text-center text-gray-500">Checking consent...</div>;

  if (consent === "denied")
    return (
      <div className="p-6 text-center text-gray-600 bg-gray-100 rounded-md">
        <p>{label}</p>
        <button
          onClick={() => {
            localStorage.setItem("cookie_consent", "granted");
            setConsent("granted");
          }}
          className="mt-3 px-4 py-2 bg-green-600 text-white rounded-md"
        >
          Allow Cookies
        </button>
      </div>
    );

  return <>{children}</>;
}
