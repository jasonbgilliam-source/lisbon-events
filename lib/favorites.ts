export const FAVORITES_STORAGE_KEY = "le_favorites_v1";
const FAVORITES_CHANGED_EVENT = "le-favorites-changed";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];

  for (const item of value) {
    const slug = String(item || "").trim();
    if (!slug) continue;
    if (!out.includes(slug)) out.push(slug);
  }

  return out;
}

export function getFavoriteSlugs(): string[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    return normalizeSlugs(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function setFavoriteSlugs(slugs: string[]) {
  if (!canUseStorage()) return;
  const clean = normalizeSlugs(slugs);
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(clean));
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
}

export function isFavorited(slug?: string | null) {
  const key = String(slug || "").trim();
  if (!key) return false;
  return getFavoriteSlugs().includes(key);
}

export function addFavorite(slug?: string | null) {
  const key = String(slug || "").trim();
  if (!key) return;
  const current = getFavoriteSlugs();
  if (current.includes(key)) return;
  setFavoriteSlugs([key, ...current]);
}

export function removeFavorite(slug?: string | null) {
  const key = String(slug || "").trim();
  if (!key) return;
  const current = getFavoriteSlugs();
  setFavoriteSlugs(current.filter((x) => x !== key));
}

export function toggleFavorite(slug?: string | null) {
  const key = String(slug || "").trim();
  if (!key) return false;

  const current = getFavoriteSlugs();
  if (current.includes(key)) {
    setFavoriteSlugs(current.filter((x) => x !== key));
    return false;
  }

  setFavoriteSlugs([key, ...current]);
  return true;
}

export function subscribeFavorites(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const handler = () => callback();

  window.addEventListener("storage", handler);
  window.addEventListener(FAVORITES_CHANGED_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(FAVORITES_CHANGED_EVENT, handler as EventListener);
  };
}
