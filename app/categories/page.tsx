import Link from "next/link";
import Image from "next/image";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type CategoryCard = {
  name: string;
  slug: string;
  image: string;
};

const CATEGORIES: CategoryCard[] = [
  { name: "Arts", slug: "arts", image: "/images/arts.jpeg" },
  { name: "Cinema", slug: "cinema", image: "/images/cinema.jpeg" },
  { name: "Comedy", slug: "comedy", image: "/images/comedy.jpeg" },
  { name: "Dance", slug: "dance", image: "/images/dance.jpeg" },
  { name: "Exhibition", slug: "exhibition", image: "/images/exhibition.jpeg" },
  { name: "Festival", slug: "festival", image: "/images/festival.jpeg" },
  { name: "Food & Drink", slug: "food-and-drink", image: "/images/food-and-drink.jpeg" },
  { name: "Lecture", slug: "lecture", image: "/images/lecture.jpeg" },
  { name: "Market", slug: "market", image: "/images/market.jpeg" },
  { name: "Music", slug: "music", image: "/images/music.jpeg" },
  { name: "Nightlife", slug: "nightlife", image: "/images/nightlife.jpeg" },
  { name: "Outdoor", slug: "outdoor", image: "/images/outdoor.jpeg" },
  { name: "Sports", slug: "sports", image: "/images/sports.jpeg" },
  { name: "Theater", slug: "theater", image: "/images/theater.jpeg" },
  { name: "Workshop", slug: "workshop", image: "/images/workshop.jpeg" },
];

const AUDIENCE_ORDER = ["All Ages", "Family", "Kids", "Teens", "Adults"] as const;

function parsePgArrayString(v: string): string[] {
  return v.replace(/[{}"]/g, "").split(",").map(x => x.trim()).filter(Boolean);
}

function normalizeAudienceValue(aud: unknown): string[] {
  if (!aud) return [];
  if (Array.isArray(aud)) return aud.map(String);
  if (typeof aud === "string") {
    if (aud.startsWith("{")) return parsePgArrayString(aud);
    if (aud.includes(",")) return aud.split(",").map(x => x.trim());
    return [aud];
  }
  return [];
}

function audiencePreviewFromRows(rows: Array<{ audience?: unknown }>, max = 3): string[] {
  const set = new Set<string>();

  for (const r of rows) {
    for (const v of normalizeAudienceValue(r.audience)) {
      const match = AUDIENCE_ORDER.find(x => x.toLowerCase() === v.toLowerCase());
      set.add(match ?? v);
    }
  }

  if (set.has("All Ages")) return ["All Ages"];

  return Array.from(set)
    .sort(
      (a, b) =>
        AUDIENCE_ORDER.indexOf(a as any) - AUDIENCE_ORDER.indexOf(b as any)
    )
    .slice(0, max);
}

export default async function CategoriesPage() {
  const supabase = supabaseServer();
  const nowIso = new Date().toISOString();

  const counts: Record<string, number> = {};
  const previews: Record<string, string[]> = {};

  for (const cat of CATEGORIES) {
    // Count
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("starts_at", nowIso)
      .ilike("category", `%${cat.name}%`);

    counts[cat.slug] = count ?? 0;

    // Preview (safe)
    const { data, error } = await supabase
      .from("events")
      .select("audience, starts_at")
      .gte("starts_at", nowIso)
      .ilike("category", `%${cat.name}%`)
      .order("starts_at", { ascending: true })
      .limit(10);

    if (!error && data) {
      previews[cat.slug] = audiencePreviewFromRows(data);
    } else {
      previews[cat.slug] = [];
    }
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
              href={`/categories/${cat.slug}?name=${encodeURIComponent(cat.name)}`}
              className="group bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-sm hover:shadow-lg transition"
            >
              <div className="relative h-40">
                <Image src={cat.image} alt={cat.name} fill className="object-cover" />
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-lg font-semibold text-[#c94917]">
                      {cat.name}
                    </div>
                    <div className="text-sm text-gray-600">View events →</div>
                  </div>

                  <div className="text-sm font-semibold bg-orange-100 text-[#c94917] px-3 py-1 rounded-full">
                    {counts[cat.slug] ?? 0}
                  </div>
                </div>

                {previews[cat.slug]?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {previews[cat.slug].map(a => (
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