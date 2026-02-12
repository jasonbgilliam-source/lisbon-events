import Link from "next/link";
import EventCard from "../components/EventCard";
import AdSlot from "../components/AdSlot";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type TabKey = "all" | "today" | "weekend";

type EventItem = {
  id?: string | number;
  title: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  start?: string;
  end?: string;
  location_name?: string;
  venue?: string;
  address?: string;
  city?: string;
  price?: string;
  age?: string;
  audience?: string[] | string;
  category?: string;
  categories?: string[] | string;
  image_url?: string;
  source_url?: string;
  source_folder?: string;
  youtube_url?: string;
  spotify_url?: string;
  is_free?: boolean;
};

function ymd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDayISO(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function endOfDayISO(d: Date): string {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

function getTabRange(tab: TabKey) {
  const now = new Date();

  if (tab === "today") {
    return { from: startOfDayISO(now), to: endOfDayISO(now), label: "Today" };
  }

  if (tab === "weekend") {
    const d = new Date(now);
    const day = d.getDay(); // 0 Sun ... 6 Sat
    const daysUntilSat = (6 - day + 7) % 7;
    const sat = new Date(d);
    sat.setDate(d.getDate() + daysUntilSat);
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);

    return {
      from: startOfDayISO(sat),
      to: endOfDayISO(sun),
      label: "This Weekend",
    };
  }

  const fromD = new Date(now);
  const toD = new Date(now);
  toD.setDate(now.getDate() + 14);

  return { from: startOfDayISO(fromD), to: endOfDayISO(toD), label: "Next 2 Weeks" };
}

async function fetchEvents(params: { from: string; to: string; limit: number }) {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("starts_at", params.from)
    .lte("starts_at", params.to)
    .order("starts_at", { ascending: true })
    .limit(params.limit);

  if (error) {
    console.error("Homepage fetchEvents error:", error.message);
    return { events: [] as EventItem[], error: error.message };
  }

  return { events: (data ?? []) as EventItem[], error: null as string | null };
}

function TabLink({
  tab,
  activeTab,
  label,
}: {
  tab: TabKey;
  activeTab: TabKey;
  label: string;
}) {
  const active = tab === activeTab;
  return (
    <Link
      href={`/?tab=${tab}`}
      className={[
        "px-4 py-2 rounded-full text-sm font-semibold border transition",
        active
          ? "bg-[#c94917] text-white border-[#c94917]"
          : "bg-white text-[#40210f] border-orange-200 hover:bg-orange-50",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const tab = (searchParams?.tab as TabKey) ?? "all";
  const safeTab: TabKey =
    tab === "today" || tab === "weekend" || tab === "all" ? tab : "all";

  const range = getTabRange(safeTab);
  const { events, error } = await fetchEvents({
    from: range.from,
    to: range.to,
    limit: 12,
  });

  return (
    <main className="min-h-screen">
      <section className="max-w-6xl mx-auto pt-10 pb-6 px-4">
        <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-3xl font-extrabold text-[#40210f]">
                What’s happening in Lisbon
              </h2>
              <p className="text-gray-700 mt-2">
                Discover concerts, food festivals, markets, and more.
              </p>

              <div className="flex flex-wrap gap-3 mt-4">
                <Link
                  href="/events"
                  className="bg-orange-100 text-[#40210f] px-5 py-2 rounded-full font-semibold hover:bg-orange-200 transition"
                >
                  Browse Events
                </Link>
                <Link
                  href="/submit"
                  className="bg-orange-100 text-[#40210f] px-5 py-2 rounded-full font-semibold hover:bg-orange-200 transition"
                >
                  Submit an Event
                </Link>
              </div>
            </div>

            <div className="md:w-[280px] bg-[#fff8f2] rounded-2xl border border-orange-200 p-4">
              <div className="text-sm uppercase tracking-wide text-gray-600">
                Curated feed
              </div>
              <div className="text-lg font-bold text-[#c94917] mt-1">
                {range.label}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Showing: {ymd(new Date(range.from))} → {ymd(new Date(range.to))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4">
        <AdSlot id="home-top" />
      </div>

      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <div className="flex flex-wrap gap-2 mb-5">
              <TabLink tab="all" activeTab={safeTab} label="All" />
              <TabLink tab="today" activeTab={safeTab} label="Today" />
              <TabLink tab="weekend" activeTab={safeTab} label="This Weekend" />
            </div>

            {error ? (
              <div className="bg-white border border-orange-200 rounded-2xl p-5 text-sm text-gray-700">
                Couldn’t load events ({error})
              </div>
            ) : (
              <div className="space-y-5">
                {events.slice(0, 6).map((e) => (
                  <EventCard key={String(e.id ?? e.title)} e={e} />
                ))}
                <AdSlot id="home-midfeed" />
                {events.slice(6).map((e) => (
                  <EventCard key={String(e.id ?? e.title) + "-b"} e={e} />
                ))}
              </div>
            )}
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <AdSlot id="home-rail-1" />
            <AdSlot id="home-rail-2" />
          </aside>
        </div>
      </section>
    </main>
  );
}