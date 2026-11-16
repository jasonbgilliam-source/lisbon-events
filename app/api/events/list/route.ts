import { loadSeries } from "@/lib/eventOccurrences";
import { matchesWindow } from "@/lib/eventSeries.mjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const AUDIENCE_ALL = "All Ages";
const AUDIENCE_EXPANDED = ["All Ages", "Family", "Kids", "Teens", "Adults"];

function parseLimit(v?: string | null) {
  const n = Number(v || 500);
  if (!Number.isFinite(n) || n <= 0) return 500;
  return Math.min(n, 2000);
}

function toISODate(v?: string | null) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseEqParam(v?: string | null) {
  if (!v) return null;
  if (v.startsWith("eq.")) return v.slice(3);
  return v;
}

function normalizeAudienceForResponse(row: any): string[] {
  const aud = row?.audience;

  if (Array.isArray(aud) && aud.length > 0) {
    return aud.map((x: any) => String(x));
  }

  return AUDIENCE_EXPANDED;
}

function isAllAgesRow(row: any): boolean {
  const aud = row?.audience;

  if (Array.isArray(aud) && aud.length > 0) {
    return aud.some((x: any) => String(x).toLowerCase() === AUDIENCE_ALL.toLowerCase());
  }

  const age = String(row?.age ?? "").trim().toLowerCase();
  if (!age) return true;
  return age === "all ages" || age === "all ages " || age === "all-ages";
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const nowISO = new Date().toISOString();
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if ((from && !toISODate(from)) || (to && !toISODate(to))) return Response.json({ error: "Invalid date filter" }, { status: 400 });
  const category = url.searchParams.get("category");
  const city = url.searchParams.get("city");
  const allAges = url.searchParams.get("all_ages");
  const limit = parseLimit(url.searchParams.get("limit"));

  const titleEq = parseEqParam(url.searchParams.get("title"));
  const startsAtEq = parseEqParam(url.searchParams.get("starts_at"));
  const locationNameEq = parseEqParam(url.searchParams.get("location_name"));
  const slugEq = parseEqParam(url.searchParams.get("slug"));

  const hasExactMatchFilters = !!(titleEq || startsAtEq || locationNameEq || slugEq);

  let items: any[];
  try {
    const groups = await loadSeries();
    items = groups.filter((e: any) =>
      (!titleEq || e.title === titleEq) && (!locationNameEq || e.location_name === locationNameEq) &&
      (!slugEq || e.members.some((m: any) => m.slug === slugEq)) &&
      (!category || e.category === category) && (!city || e.city === city)
    ).map((e: any) => {
      const upcoming = e.occurrences.filter((o: any) => (hasExactMatchFilters || from || to || matchesWindow(o, nowISO, null)) && matchesWindow(o, from, to) && (!startsAtEq || o.starts_at === toISODate(startsAtEq)));
      return { ...e, audience: normalizeAudienceForResponse(e),
        starts_at: upcoming[0]?.starts_at, ends_at: upcoming[0]?.ends_at,
        occurrences: e.occurrences.filter((o: any) => matchesWindow(o, nowISO, null)), matched_occurrences: upcoming };
    }).filter((e: any) => e.matched_occurrences.length)
      .sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at)).slice(0, limit);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (allAges === "true") {
    items = items.filter(isAllAgesRow);
  }

  if (url.searchParams.get("view") === "calendar") {
    items = items.flatMap((event: any) => event.matched_occurrences.map((o: any) => ({
      ...event, ...o, slug: event.slug, id: `${event.id}::${o.starts_at}`,
    })));
  }
  return new Response(JSON.stringify({ items, limit, source: "events" }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
