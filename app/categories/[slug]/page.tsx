import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type Props = {
  params: { slug: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  category: string | null;
  location_name: string | null;
  address: string | null;
  city: string | null;
};

function firstParam(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function fmt(dt: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : d.toLocaleString();
}

export default async function CategoryDetailPage({ params, searchParams }: Props) {
  const slug = decodeURIComponent(params.slug || "").trim();
  const categoryName = decodeURIComponent(firstParam(searchParams?.name) || "").trim();

  // Fallback if someone hits /categories/foo directly
  const guessedName = slug
    .replace(/-/g, " ")
    .replace(/\band\b/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  const filterName = categoryName || guessedName;

  const supabase = supabaseServer();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("events")
    .select(
      [
        "id",
        "slug",
        "title",
        "starts_at",
        "ends_at",
        "category",
        "location_name",
        "address",
        "city",
      ].join(",")
    )
    .gte("starts_at", nowIso)
    // 🔑 IMPORTANT FIX: fuzzy match instead of exact match
    .ilike("category", `%${filterName}%`)
    .order("starts_at", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
        <section className="max-w-5xl mx-auto">
          <Link className="underline text-sm" href="/categories">
            ← Back to categories
          </Link>
          <h1 className="text-3xl font-bold mt-4 mb-2">Category error</h1>
          <pre className="text-sm bg-white border rounded-lg p-3 overflow-auto">
            {error.message}
          </pre>
        </section>
      </main>
    );
  }

  const events = (data ?? []) as EventRow[];

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <section className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <Link className="underline text-sm" href="/categories">
            ← Back to categories
          </Link>
          <Link className="underline text-sm" href="/events">
            View all events →
          </Link>
        </div>

        <h1 className="text-4xl font-bold mt-6 mb-2 text-[#c94917]">
          {filterName}
        </h1>
        <p className="text-sm text-gray-700 mb-8">
          Upcoming events in this category.
        </p>

        {events.length === 0 ? (
          <div className="text-gray-600 italic">
            No upcoming events found for this category.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {events.map((e) => (
              <Link
                key={e.id}
                href={`/events/${encodeURIComponent(e.slug)}`}
                className="bg-white border border-orange-200 rounded-2xl p-5 shadow-sm hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xl font-semibold text-[#c94917]">{e.title}</div>
                    <div className="text-sm text-gray-700 mt-1">
                      {e.starts_at ? `🕒 ${fmt(e.starts_at)}` : ""}
                      {e.ends_at ? ` – ${fmt(e.ends_at)}` : ""}
                    </div>
                    <div className="text-sm text-gray-700 mt-1">
                      📍 {[e.location_name, e.address, e.city].filter(Boolean).join(" • ") || "Location TBA"}
                    </div>
                  </div>
                  <div className="text-sm underline">View</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
