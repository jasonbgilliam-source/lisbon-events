"use client";

import { useEffect, useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) setVisible(true);
  }, []);

  const handleChoice = (value: "granted" | "denied") => {
    localStorage.setItem("cookie_consent", value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white p-4 z-50 shadow-lg">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-sm">
          We use cookies to improve your experience. Essential cookies are always enabled. 
          You can choose to allow or reject analytics cookies.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleChoice("denied")}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
          >
            Reject
          </button>
          <button
            onClick={() => handleChoice("granted")}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md text-sm"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
