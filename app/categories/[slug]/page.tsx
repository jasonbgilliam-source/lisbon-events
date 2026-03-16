import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import EventStaticMap from "@/components/EventStaticMap";
import {
  findCategoryBySlug,
  matchesCategorySlug,
  normalizeAudienceValue,
} from "@/lib/categoryMeta";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: { slug: string };
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  category: string | null;
  location_name: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  price: string | null;
  audience: unknown;
  image_url: string | null;
};

function fmt(dt: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? dt : d.toLocaleString();
}

function hasMapData(e: EventRow) {
  return (
    (typeof e.latitude === "number" && typeof e.longitude === "number") ||
    Boolean(e.location_name || e.city)
  );
}

function toEventRows(data: unknown): EventRow[] {
  if (!Array.isArray(data)) return [];

  return data
    .map((item): EventRow | null => {
      if (!item || typeof item !== "object") return null;

      const row = item as Record<string, unknown>;

      if (
        typeof row.id !== "string" ||
        typeof row.slug !== "string" ||
        typeof row.title !== "string"
      ) {
        return null;
      }

      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: typeof row.description === "string" ? row.description : null,
        starts_at: typeof row.starts_at === "string" ? row.starts_at : null,
        ends_at: typeof row.ends_at === "string" ? row.ends_at : null,
        category: typeof row.category === "string" ? row.category : null,
        location_name: typeof row.location_name === "string" ? row.location_name : null,
        address: typeof row.address === "string" ? row.address : null,
        city: typeof row.city === "string" ? row.city : null,
        latitude: typeof row.latitude === "number" ? row.latitude : null,
        longitude: typeof row.longitude === "number" ? row.longitude : null,
        price: typeof row.price === "string" ? row.price : null,
        audience: row.audience,
        image_url: typeof row.image_url === "string" ? row.image_url : null,
      };
    })
    .filter((row): row is EventRow => row !== null);
}

function descriptionPreview(input: string | null, max = 140) {
  const text = String(input || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export default async function CategoryDetailPage({ params }: Props) {
  const slug = decodeURIComponent(params.slug || "").trim();
  if (!slug) notFound();

  const category = findCategoryBySlug(slug);
  if (!category) notFound();

  const supabase = supabaseServer();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("events")
    .select(
      [
        "id",
        "slug",
        "title",
        "description",
        "starts_at",
        "ends_at",
        "category",
        "location_name",
        "address",
        "city",
        "latitude",
        "longitude",
        "price",
        "audience",
        "image_url",
      ].join(",")
    )
    .or(`ends_at.gte.${nowIso},and(ends_at.is.null,starts_at.gte.${nowIso})`)
    .order("starts_at", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
        <section className="max-w-6xl mx-auto">
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

  const allEvents = toEventRows(data);
  const events = allEvents.filter((e) => matchesCategorySlug(slug, e.category));

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <section className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <Link className="underline text-sm" href="/categories">
            ← Back to categories
          </Link>
          <Link className="underline text-sm" href="/events">
            View all events →
          </Link>
        </div>

        <h1 className="text-4xl font-bold mt-6 mb-2 text-[#c94917]">{category.name}</h1>
        <p className="text-sm text-gray-700 mb-8">Upcoming events in this category.</p>

        {events.length === 0 ? (
          <div className="text-gray-600 italic">No upcoming events found for this category.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {events.map((e) => {
              const showMap = hasMapData(e);
              const audience = normalizeAudienceValue(e.audience).slice(0, 2);
              const preview = descriptionPreview(e.description);
              const imageUrl = e.image_url?.trim() || "/images/default.jpeg";

              return (
                <article
                  key={e.id}
                  className="bg-white border border-orange-200 rounded-2xl shadow-sm hover:shadow-lg transition overflow-hidden"
                >
                  <Link href={`/events/${encodeURIComponent(e.slug)}`} className="block">
                    <div className="relative h-44 bg-[#f5ede6] overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={e.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4">
                        <div className="text-white text-xl font-semibold leading-tight">
                          {e.title}
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="bg-orange-50 text-[#c94917] text-xs font-semibold px-2 py-1 rounded-full border border-orange-200">
                        {category.name}
                      </span>

                      {e.price ? (
                        <span className="bg-gray-50 text-gray-700 text-xs font-semibold px-2 py-1 rounded-full border">
                          {e.price}
                        </span>
                      ) : null}

                      {audience.map((a) => (
                        <span
                          key={a}
                          className="bg-gray-50 text-gray-700 text-xs font-semibold px-2 py-1 rounded-full border"
                        >
                          {a}
                        </span>
                      ))}
                    </div>

                    <div className="text-sm text-gray-700">
                      {e.starts_at ? `🕒 ${fmt(e.starts_at)}` : ""}
                      {e.ends_at ? ` – ${fmt(e.ends_at)}` : ""}
                    </div>

                    <div className="text-sm text-gray-700 mt-1">
                      📍 {[e.location_name, e.address, e.city].filter(Boolean).join(" • ") || "Location TBA"}
                    </div>

                    {preview ? (
                      <p className="text-sm text-gray-700 mt-3 leading-6">
                        {preview}
                      </p>
                    ) : null}

                    <div className="mt-4">
                      <Link
                        href={`/events/${encodeURIComponent(e.slug)}`}
                        className="text-sm font-medium underline"
                      >
                        View full event →
                      </Link>
                    </div>
                  </div>

                  {showMap ? (
                    <div className="border-t bg-gray-50 px-4 py-3">
                      <div className="text-xs font-semibold text-gray-600 mb-2">Location</div>
                      <div className="overflow-hidden rounded-xl">
                        <EventStaticMap
                          latitude={e.latitude}
                          longitude={e.longitude}
                          location_name={e.location_name}
                          city={e.city}
                        />
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
