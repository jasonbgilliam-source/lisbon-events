// app/categories/page.tsx
import { cookies } from "next/headers";
import ConsentGate from "@/components/ConsentGate"; // ✅ fixed import

export default function CategoriesPage() {
  const cookieStore = cookies();
  const consent = cookieStore.get("cookie_consent");

  return (
    <ConsentGate consent={consent?.value}>
      <main className="p-6">
        <h1 className="text-3xl font-bold mb-4">All Categories</h1>
        <p>Here we will render category listings.</p>
      </main>
    </ConsentGate>
  );
}
