import React from "react";
import ConsentGate from "../components/ConsentGate";

export default function CategoriesPage() {
  return (
    <ConsentGate>
      <main className="p-6">
        <h1 className="text-3xl font-bold mb-4">All Categories</h1>
        <p>Here we will render category listings.</p>
      </main>
    </ConsentGate>
  );
}
