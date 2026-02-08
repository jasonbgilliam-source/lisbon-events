import * as React from "react";

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#fff8f2] text-[#40210f]">
      <div
        className="relative h-[160px] bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hero-lisbon.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <h1 className="text-3xl font-bold text-white drop-shadow">Lisbon Events</h1>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
