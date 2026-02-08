import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type Props = {
  params: { slug: string };
};

function fmt(dt: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : d.toLocaleString();
}

export default async function EventDetailPage({ params }: Props) {
  const slug = decodeURIComponent(params.slug || "").trim();
  if (!slug) return notFound();

  const supabase = supabaseServer();

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
        "ticket_url",
        "image_url",
        "youtube_url",
        "spotify_url",
      ].join(",")
    )
    .eq("slug", slug)
    .limit(1);

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link className="underline text-sm" href="/events">
            ← Back to events
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-2">Event detail error</h1>
        <pre className="text-sm bg-white border rounded-lg p-3 overflow-auto">{error.message}</pre>
      </div>
    );
  }

  const ev = data?.[0];
  if (!ev) return notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link className="underline text-sm" href="/events">
          ← Back to events
        </Link>
      </div>

      <div className="inline-block text-xs font-semibold px-2 py-1 rounded bg-black text-white mb-3">
        DETAIL PAGE
      </div>

      <h1 className="text-3xl font-bold mb-2">{ev.title}</h1>
      <div className="text-sm text-gray-700 mb-6">
        <div>
          <span className="font-semibold">Slug:</span> {ev.slug}
        </div>
        <div>
          <span className="font-semibold">Starts:</span> {fmt(ev.starts_at)}
        </div>
        {ev.ends_at ? (
          <div>
            <span className="font-semibold">Ends:</span> {fmt(ev.ends_at)}
          </div>
        ) : null}
        {ev.category ? (
          <div>
            <span className="font-semibold">Category:</span> {ev.category}
          </div>
        ) : null}
        {ev.location_name || ev.address ? (
          <div>
            <span className="font-semibold">Location:</span>{" "}
            {[ev.location_name, ev.address, ev.city].filter(Boolean).join(" • ")}
          </div>
        ) : null}
      </div>

      {ev.image_url ? (
        <div className="mb-6">
          <img
            src={ev.image_url}
            alt={ev.title}
            className="w-full max-h-[420px] object-cover rounded-xl border bg-white"
          />
        </div>
      ) : null}

      {ev.description ? (
        <div className="prose max-w-none mb-6">
          <p className="whitespace-pre-wrap">{ev.description}</p>
        </div>
      ) : (
        <div className="text-sm text-gray-600 mb-6">No description.</div>
      )}

      <div className="flex flex-wrap gap-3">
        {ev.ticket_url ? (
          <a className="px-4 py-2 rounded-lg border bg-white hover:bg-orange-50" href={ev.ticket_url} target="_blank" rel="noreferrer">
            Tickets / Info
          </a>
        ) : null}
        {ev.youtube_url ? (
          <a className="px-4 py-2 rounded-lg border bg-white hover:bg-orange-50" href={ev.youtube_url} target="_blank" rel="noreferrer">
            YouTube
          </a>
        ) : null}
        {ev.spotify_url ? (
          <a className="px-4 py-2 rounded-lg border bg-white hover:bg-orange-50" href={ev.spotify_url} target="_blank" rel="noreferrer">
            Spotify
          </a>
        ) : null}
      </div>
    </div>
  );
}
