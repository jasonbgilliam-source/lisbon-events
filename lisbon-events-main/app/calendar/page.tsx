"use client";

import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/en";

type EventItem = {
  title: string;
  start: string;
  end: string;
  category?: string;
  venue?: string;
  city?: string;
  source_url?: string;
};

export default function CalendarPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [monthEvents, setMonthEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    async function loadCSV() {
      try {
        const res = await fetch("/events.csv");
        const text = await res.text();
        const lines = text.split("\n").filter((l) => l.trim() !== "");
        const headers = lines[0].split(",").map((h) => h.trim());
        const data = lines.slice(1).map((line) => {
          const cols = line.split(",");
          return headers.reduce((acc: any, key, i) => {
            acc[key] = cols[i]?.trim();
            return acc;
          }, {});
        });
        setEvents(data);
      } catch (err) {
        console.error("Failed to load events:", err);
      }
    }
    loadCSV();
  }, []);

  useEffect(() => {
    const startOfMonth = currentMonth.startOf("month");
    const endOfMonth = currentMonth.endOf("month");

    const filtered = events.filter((e) => {
      const start = dayjs(e.start);
      return start.isAfter(startOfMonth.subtract(1, "day")) && start.isBefore(endOfMonth.add(1, "day"));
    });
    setMonthEvents(filtered);
  }, [events, currentMonth]);

  const daysInMonth = Array.from({ length: currentMonth.daysInMonth() }, (_, i) =>
    currentMonth.date(i + 1)
  );

  const firstDayOfMonth = currentMonth.startOf("month").day();
  const paddedDays = Array.from({ length: firstDayOfMonth }, () => null);

  const handlePrev = () => setCurrentMonth(currentMonth.subtract(1, "month"));
  const handleNext = () => setCurrentMonth(currentMonth.add(1, "month"));

  const getCategoryColor = (cat: string | undefined) => {
    if (!cat) return "bg-orange-100 border-orange-300";
    const colors: Record<string, string> = {
      Music: "bg-[#F9E0D0] border-[#C94917]",
      Art: "bg-[#FDF3E6] border-[#E4A663]",
      Food: "bg-[#FCEAE0] border-[#D76C4A]",
      Culture: "bg-[#F7F2EE] border-[#B08B74]",
      Market: "bg-[#FFF7E8] border-[#D4A017]",
    };
    return colors[cat] || "bg-orange-100 border-orange-300";
  };

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f]">
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={handlePrev}
            className="px-3 py-1 border border-[#c94917] text-[#c94917] rounded-lg hover:bg-orange-50"
          >
            ← Prev
          </button>
          <h1 className="text-3xl font-bold">
            {currentMonth.format("MMMM YYYY")}
          </h1>
          <button
            onClick={handleNext}
            className="px-3 py-1 border border-[#c94917] text-[#c94917] rounded-lg hover:bg-orange-50"
          >
            Next →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center font-semibold mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-[#c94917]">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {[...paddedDays, ...daysInMonth].map((day, i) => {
            if (!day) return <div key={`pad-${i}`} />;
            const dateEvents = monthEvents.filter((e) =>
              dayjs(e.start).isSame(day, "day")
            );

            return (
              <div
                key={day.format("YYYY-MM-DD")}
                className="border border-orange-200 rounded-xl p-2 h-28 bg-white shadow-sm hover:shadow-lg transition"
              >
                <div className="font-semibold text-sm mb-1 text-[#40210f]">
                  {day.date()}
                </div>
                <div className="space-y-1 overflow-y-auto max-h-20">
                  {dateEvents.map((ev, idx) => (
                    <a
                      key={idx}
                      href={`/events?title=${encodeURIComponent(ev.title)}`}
                      className={`block text-xs border rounded-md px-2 py-1 ${getCategoryColor(
                        ev.category
                      )} hover:opacity-80 transition`}
                      title={ev.title}
                    >
                      {ev.title}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {monthEvents.length === 0 && (
          <p className="text-center mt-10 text-gray-600 italic">
            No events found for this month.
          </p>
        )}
      </section>
    </main>
  );
}
