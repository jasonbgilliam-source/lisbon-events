"use client";

import React, { Suspense } from "react";
import CalendarInner from "@/components/CalendarInner";

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <p className="text-center text-gray-500 italic mt-10">
          Loading calendar…
        </p>
      }
    >
      <CalendarInner />
    </Suspense>
  );
}
