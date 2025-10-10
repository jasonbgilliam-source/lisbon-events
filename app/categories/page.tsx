import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Event = {
  id: number;
  title: string;
  category: string | null;
  starts_at: string | null;
  ends_at: string | null;
  location_name?: string;
  city?: string;
  description?: string;
  image_url?: string;
  source_url?: string;
};

export default async function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  // 🧠 Convert the slug back to a normal category name
  const categoryName = decodeURIComponent(params.category)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()); // capitalize each word if needed

  // 👇 Or if your DB categories are not capitalized, you could just do:
  // const categoryName = decodeURIComponent(params.category).replace(/-/g, " ");

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .ilike("category", categoryName); // case-insensitive match

  if (error) {
    console.error("Error fetching category events:", error);
    return <p>Failed to load events.</p>;
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">{categoryName}</h1>

      {events && events.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <li key={event.id} className="bg-white shadow rounded p-4">
              <h2 className="text-xl font-semibold mb-2">{event.title}</h2>
              {event.image_url && (
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="w-full h-48 object-cover rounded"
                />
              )}
              <p className="text-sm text-gray-600">{event.location_name}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600 italic">No events found in this category.</p>
      )}
    </main>
  );
}

