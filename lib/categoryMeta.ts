// lib/categoryMeta.ts
export type CategoryMeta = {
  name: string;           // Canonical catalog name
  slug: string;           // URL slug
  heroImage: string;      // /public path
  embeds?: Array<
    | { type: "youtube"; url: string; title?: string }
    | { type: "html"; html: string; title?: string } // blogger or custom embed
  >;
};

// Simple slugify that keeps only a-z0-9- and collapses dashes
export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")    // remove diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

export function buildCatalogIndex(catalog: string[]) {
  const list: CategoryMeta[] = catalog.map((name) => ({
    name,
    slug: slugify(name),
    // map a default image per category name; swap these filenames as you like
    heroImage:
      name.toLowerCase().includes("music") || name.toLowerCase().includes("night")
        ? "/images/cat-music.jpg"
        : name.toLowerCase().includes("food")
        ? "/images/cat-food.jpg"
        : name.toLowerCase().includes("art")
        ? "/images/cat-arts.jpg"
        : name.toLowerCase().includes("family")
        ? "/images/cat-family.jpg"
        : name.toLowerCase().includes("sport")
        ? "/images/cat-sports.jpg"
        : "/images/lisbon-skyline.jpg",
    embeds: [], // can be filled in via augmentCategoryEmbeds below
  }));

  // Optional: add curated embeds by name (examples—edit/expand freely)
  function augmentCategoryEmbeds(meta: CategoryMeta) {
    const n = meta.name.toLowerCase();
    if (n.includes("music") || n.includes("night")) {
      meta.embeds = [
        { type: "youtube", url: "https://www.youtube.com/embed/5qap5aO4i9A", title: "Lisbon Live Mix" },
      ];
    }
    if (n.includes("food")) {
      meta.embeds = [
        { type: "html", title: "Lisbon Food Blogger",
          html: `<iframe src="https://www.instagram.com/p/CsJb3xbL7Xy/embed" width="400" height="480" frameborder="0" scrolling="no" allowtransparency="true"></iframe>` },
      ];
    }
    return meta;
  }

  const index = new Map<string, CategoryMeta>();
  for (const m of list) index.set(m.slug, augmentCategoryEmbeds(m));
  return { list, bySlug: index };
}
