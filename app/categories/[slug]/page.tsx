import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import EventStaticMap from "@/components/EventStaticMap";

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
  latitude: number | null;
  longitude: number | null;
};

function fmt(dt: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : d.toLocaleString();
}

function hasMapData(e: EventRow) {
  return (
    (typeof e.latitude === "number" && typeof e.longitude === "number") ||
    Boolean(e.location_name || e.city)
  );
}

export default async function CategoryDetailPage({ params }: Props) {
  const slug = decodeURIComponent(params.slug || "").trim();
  if (!slug) notFound();

  const supabase = supabaseServer();
  const nowIso = new Date().toISOString();

  const { data: categoryData, error: categoryError } = await supabase
    .from("category_catalog")
    .select("name, slug")
    .eq("slug", slug)
    .single();

  if (categoryError || !categoryData?.name) {
    notFound();
  }

  const canonicalName = categoryData.name;

  const { data: eventsData, error: eventsError } = await supabase
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
        "latitude",
        "longitude",
      ].join(",")
    )
    .gte("starts_at", nowIso)
    .eq("category", canonicalName)
    .order("starts_at", { ascending: true });

  if (eventsError) {
    return (
      <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
        <section className="max-w-5xl mx-auto">
          <Link className="underline text-sm" href="/categories">
            ← Back to categories
          </Link>
          <h1 className="text-3xl font-bold mt-4 mb-2">Category error</h1>
          <pre className="text-sm bg-white border rounded-lg p-3 overflow-auto">
            {eventsError.message}
          </pre>
        </section>
      </main>
    );
  }

  const events = (eventsData ?? []) as unknown as EventRow[];

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

        <h1 className="text-4xl font-bold mt-6 mb-2 text-[#c94917]">{canonicalName}</h1>
        <p className="text-sm text-gray-700 mb-8">Upcoming events in this category.</p>

        {events.length === 0 ? (
          <div className="text-gray-600 italic">No upcoming events found for this category.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {events.map((e) => {
              const showMap = hasMapData(e);

              return (
                <div
                  key={e.id}
                  className="bg-white border border-orange-200 rounded-2xl shadow-sm hover:shadow-lg transition overflow-hidden"
                >
                  <Link
                    href={`/events/${encodeURIComponent(e.slug)}`}
                    className="block p-5"
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
                      <div className="text-sm underline shrink-0">View</div>
                    </div>
                  </Link>

                  {showMap ? (
                    <div className="border-t bg-gray-50 px-5 py-4">
                      <EventStaticMap
                        latitude={e.latitude}
                        longitude={e.longitude}
                        location_name={e.location_name}
                        city={e.city}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
