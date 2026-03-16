export type CategoryDef = {
  name: string;
  slug: string;
  image: string;
  aliases: string[];
};

export const CATEGORIES: CategoryDef[] = [
  { name: "Arts", slug: "arts", image: "/images/arts.jpeg", aliases: ["arts", "artes"] },
  { name: "Cinema", slug: "cinema", image: "/images/cinema.jpeg", aliases: ["cinema"] },
  { name: "Comedy", slug: "comedy", image: "/images/comedy.jpeg", aliases: ["comedy", "stand up comedy"] },
  { name: "Dance", slug: "dance", image: "/images/dance.jpeg", aliases: ["dance"] },
  { name: "Exhibition", slug: "exhibition", image: "/images/exhibition.jpg", aliases: ["exhibition", "exhibitions"] },
  { name: "Festival", slug: "festival", image: "/images/festival.jpeg", aliases: ["festival", "festivals"] },
  { name: "Food & Drink", slug: "food-and-drink", image: "/images/food&drink.jpeg", aliases: ["food & drink", "food and drink"] },
  { name: "Lecture", slug: "lecture", image: "/images/lecture.jpeg", aliases: ["lecture"] },
  { name: "Market", slug: "market", image: "/images/market.jpeg", aliases: ["market", "fairs"] },
  { name: "Music", slug: "music", image: "/images/music.jpeg", aliases: ["music"] },
  { name: "Nightlife", slug: "nightlife", image: "/images/nightlife.jpeg", aliases: ["nightlife"] },
  { name: "Outdoor", slug: "outdoor", image: "/images/outdoor.jpeg", aliases: ["outdoor"] },
  { name: "Sports", slug: "sports", image: "/images/sports.jpeg", aliases: ["sports"] },
  { name: "Theater", slug: "theater", image: "/images/theater.jpeg", aliases: ["theater", "theatre", "theater opera & dance"] },
  { name: "Workshop", slug: "workshop", image: "/images/workshops.jpeg", aliases: ["workshop"] },
];

export const AUDIENCE_ORDER = ["All Ages", "Family", "Kids", "Teens", "Adults"] as const;

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export function findCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function matchesCategorySlug(slug: string, rawCategory: unknown) {
  const def = findCategoryBySlug(slug);
  if (!def) return false;

  const raw = norm(rawCategory);
  if (!raw) return false;

  return def.aliases.some((alias) => raw === norm(alias));
}

export function parsePgArrayString(v: string): string[] {
  return v
    .replace(/[{}"]/g, "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function normalizeAudienceValue(aud: unknown): string[] {
  if (!aud) return [];
  if (Array.isArray(aud)) return aud.map(String);

  if (typeof aud === "string") {
    if (aud.startsWith("{")) return parsePgArrayString(aud);
    if (aud.includes(",")) return aud.split(",").map((x) => x.trim()).filter(Boolean);
    return [aud];
  }

  return [];
}

export function audiencePreviewFromRows(rows: Array<{ audience?: unknown }>, max = 3): string[] {
  const set = new Set<string>();

  for (const r of rows) {
    for (const v of normalizeAudienceValue(r.audience)) {
      const match = AUDIENCE_ORDER.find((x) => x.toLowerCase() === String(v).toLowerCase());
      set.add(match ?? String(v));
    }
  }

  if (set.has("All Ages")) return ["All Ages"];

  return Array.from(set)
    .sort((a, b) => AUDIENCE_ORDER.indexOf(a as any) - AUDIENCE_ORDER.indexOf(b as any))
    .slice(0, max);
}
