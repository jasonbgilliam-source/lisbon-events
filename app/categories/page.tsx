import Link from "next/link";
import Image from "next/image";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  CATEGORIES,
  audiencePreviewFromRows,
  matchesCategorySlug,
} from "@/lib/categoryMeta";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EventLite = {
  category: string | null;
  audience?: unknown;
  starts_at: string | null;
  ends_at: string | null;
};

export default async function CategoriesPage() {
  const supabase = supabaseServer();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("events")
    .select("category,audience,starts_at,ends_at")
    .or(`ends_at.gte.${nowIso},and(ends_at.is.null,starts_at.gte.${nowIso})`)
    .order("starts_at", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
        <section className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center text-[#c94917]">Categories</h1>
          <pre className="text-sm bg-white border rounded-lg p-3 overflow-auto">
            {error.message}
          </pre>
        </section>
      </main>
    );
  }

  const rows = Array.isArray(data) ? (data as EventLite[]) : [];

  const counts: Record<string, number> = {};
  const previews: Record<string, string[]> = {};

  for (const cat of CATEGORIES) {
    const matching = rows.filter((row) => matchesCategorySlug(cat.slug, row.category));
    counts[cat.slug] = matching.length;
    previews[cat.slug] = audiencePreviewFromRows(matching);
  }

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <section className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-[#c94917]">
          Categories
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="group bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-sm hover:shadow-lg transition"
            >
              <div className="relative h-40 bg-[#f5ede6]">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="text-lg font-semibold text-[#c94917]">
                      {cat.name}
                    </div>
                    <div className="text-sm text-gray-600">View events →</div>
                  </div>

                  <div className="text-sm font-semibold bg-orange-100 text-[#c94917] px-3 py-1 rounded-full shrink-0">
                    {counts[cat.slug] ?? 0}
                  </div>
                </div>

                {previews[cat.slug]?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {previews[cat.slug].map((a) => (
                      <span
                        key={a}
                        className="bg-orange-50 text-[#c94917] text-xs font-semibold px-2 py-1 rounded-full border border-orange-200"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
