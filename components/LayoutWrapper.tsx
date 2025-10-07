import React from 'react';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fffaf5] text-gray-900 flex flex-col">
      <main className="flex-1 container mx-auto p-4">{children}</main>
      <footer className="text-center py-4 text-sm text-[#b84b22]">
        Powered by Nata & Bica ☕🍮 — Lisbon 360°
      </footer>
    </div>
  );
}
