// app/categories/[slug]/page.tsx
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import ConsentGate from "@/components/ConsentGate";

interface CategoryPageProps {
  params: { slug: string };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = params;
  const cookieStore = cookies();
  const consent = cookieStore.get("cookie_consent");

  if (!slug) {
    notFound();
  }

  return (
    <ConsentGate consent={consent?.value}>
      <main className="p-6">
        <h1 className="text-3xl font-bold mb-4">Category: {slug}</h1>
        <p>Here we will render events for this category.</p>
      </main>
    </ConsentGate>
  );
}
