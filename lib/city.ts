export type CitySlug =
  | "lisbon"
  | "porto"
  | "madrid"
  | "barcelona"
  | "paris"
  | "berlin"
  | "rome";

export type CityTheme = {
  slug: CitySlug;
  displayName: string;
  brandName: string;
  accent: string;
  accentSoft: string;
  bg: string;
  text: string;
  heroImage: string;
  tileImage: string;
};

const DEFAULT_HERO = "/images/hero-lisbon.jpg";
const DEFAULT_TILE = "/images/tile-lisbon.jpg";

const THEMES: Record<CitySlug, CityTheme> = {
  lisbon: {
    slug: "lisbon",
    displayName: "Lisbon",
    brandName: "Lisbon Events",
    accent: "#c94917",
    accentSoft: "#ffedd5",
    bg: "#fff8f2",
    text: "#40210f",
    heroImage: DEFAULT_HERO,
    tileImage: DEFAULT_TILE,
  },
  porto: {
    slug: "porto",
    displayName: "Porto",
    brandName: "Porto Events",
    accent: "#1f6feb",
    accentSoft: "#dbeafe",
    bg: "#f7fbff",
    text: "#0b234a",
    heroImage: DEFAULT_HERO,
    tileImage: DEFAULT_TILE,
  },
  madrid: {
    slug: "madrid",
    displayName: "Madrid",
    brandName: "Madrid Events",
    accent: "#b91c1c",
    accentSoft: "#fee2e2",
    bg: "#fff7f7",
    text: "#3b0a0a",
    heroImage: DEFAULT_HERO,
    tileImage: DEFAULT_TILE,
  },
  barcelona: {
    slug: "barcelona",
    displayName: "Barcelona",
    brandName: "Barcelona Events",
    accent: "#a855f7",
    accentSoft: "#f3e8ff",
    bg: "#fbf7ff",
    text: "#2a0b3b",
    heroImage: DEFAULT_HERO,
    tileImage: DEFAULT_TILE,
  },
  paris: {
    slug: "paris",
    displayName: "Paris",
    brandName: "Paris Events",
    accent: "#0f766e",
    accentSoft: "#ccfbf1",
    bg: "#f6fffd",
    text: "#083b36",
    heroImage: DEFAULT_HERO,
    tileImage: DEFAULT_TILE,
  },
  berlin: {
    slug: "berlin",
    displayName: "Berlin",
    brandName: "Berlin Events",
    accent: "#111827",
    accentSoft: "#e5e7eb",
    bg: "#f8fafc",
    text: "#111827",
    heroImage: DEFAULT_HERO,
    tileImage: DEFAULT_TILE,
  },
  rome: {
    slug: "rome",
    displayName: "Rome",
    brandName: "Rome Events",
    accent: "#92400e",
    accentSoft: "#ffedd5",
    bg: "#fffbf5",
    text: "#2b1607",
    heroImage: DEFAULT_HERO,
    tileImage: DEFAULT_TILE,
  },
};

const ALLOWED = new Set(Object.keys(THEMES));

function normalizeCitySlug(raw: string): CitySlug | null {
  const v = raw.toLowerCase().trim();
  return (ALLOWED.has(v) ? (v as CitySlug) : null);
}

/**
 * Host parsing rules:
 * - localhost / vercel.app previews => default "lisbon"
 * - production: <city>.<rootDomain> => city
 * - otherwise => default
 */
export function getCityFromHost(host: string): CitySlug {
  const h = host.toLowerCase();

  if (h.includes("localhost") || h.endsWith(".vercel.app")) return "lisbon";

  const noPort = h.split(":")[0] ?? h;
  const parts = noPort.split(".").filter(Boolean);

  // Need at least subdomain + domain + tld
  if (parts.length < 3) return "lisbon";

  const sub = parts[0];
  return normalizeCitySlug(sub) ?? "lisbon";
}

export function getTheme(city: CitySlug): CityTheme {
  return THEMES[city] ?? THEMES.lisbon;
}

export const CITY_ORDER: CitySlug[] = [
  "lisbon",
  "porto",
  "madrid",
  "barcelona",
  "paris",
  "berlin",
  "rome",
];
