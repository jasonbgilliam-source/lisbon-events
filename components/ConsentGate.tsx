'use client';
import React, { useState, useEffect } from 'react';

export default function ConsentGate({ children }: { children: React.ReactNode }) {
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('consent');
    if (stored === 'true') setConsentGiven(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('consent', 'true');
    setConsentGiven(true);
  };

  if (consentGiven) return <>{children}</>;

  return (
    <div className="fixed inset-0 bg-white/90 flex flex-col items-center justify-center z-50 p-4">
      <div className="bg-[#fff8f3] border border-[#e1a46e] rounded-xl p-6 text-center max-w-md">
        <h2 className="text-xl font-semibold text-[#b84b22] mb-2">🍪 Cookie Preferences</h2>
        <p className="text-gray-700 mb-4">
          We use cookies to improve your Lisbon experience and analyze event trends.
        </p>
        <button
          onClick={handleAccept}
          className="bg-[#b84b22] text-white rounded-lg px-6 py-2 hover:bg-[#a4431e] transition"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
