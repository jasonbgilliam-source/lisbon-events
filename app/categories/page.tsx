"use client";

import React, { Suspense } from "react";
import CategoriesInner from "@/components/CategoriesInner";

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={
        <p className="text-center text-gray-500 italic mt-10">
          Loading categories…
        </p>
      }
    >
      <CategoriesInner />
    </Suspense>
  );
}
