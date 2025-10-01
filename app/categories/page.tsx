"use client";

import * as React from "react";
import Link from "next/link";
import { buildCatalogIndex } from "@/lib/categoryMeta";
import ConsentGate from "@/app/components/ConsentGate";

export default function CategoriesLanding() {
  const [cards, setCards] = React.useState<{ name: string; slug: string; img: string }[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories/list", { cache: "no-store" });
        const j = await res.json();
        const list: string[] = j.categories || [];
        const { list: metas } = buildCatalogIndex(list);
        setCards(metas.map(m => ({ name: m.name, slug: m.slug, img: m.heroImage })));
      } catch {}
    })();
  }, []);

  return (
    <main className="max-w-7xl mx-auto p-6">
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2">
          <h1 className="text-2xl md:text-3xl font-semibold">What’s your vibe?</h1>
          <p className="text-gray-700 mt-2">
            Explore Lisbon by <em>scene</em>: music, food & drink, arts, family, sports, and more.
            We curate the best upcoming events — pick a category and dive in.
          </p>
        </div>
        <div className="hidden md:flex items-center justify-center">
          <div className="h-2 w-40 rounded" style={{ background: "linear-gradient(90deg,var(--lis-ocean),var(--lis-tram))" }} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c) => (
          <Link key={c.slug} href={`/categories/${c.slug}`} className="group card overflow-hidden">
            <div className="h-40 relative">
              <img src={c.img} alt={c.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <div className="text-lg font-semibold">{c.name}</div>
                <div className="text-xs text-white/80">See upcoming</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <div className="tile-rule text-lg font-semibold mb-3">From the blogs</div>
        <p className="text-sm text-gray-700 mb-3">Handpicked posts and clips that match each scene.</p>
        <div className="grid md:grid-cols-2 gap-4">
          <ConsentGate label="Enable cookies to view this YouTube feature.">
            <div className="card p-3">
              <div className="text-sm font-medium mb-2">Music — Featured Set</div>
              <div className="aspect-video">
                <iframe
                  className="w-full h-full rounded-xl"
                  src="https://www.youtube.com/embed/5qap5aO4i9A"
                  title="Lisbon Live Mix"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </ConsentGate>

          <ConsentGate label="Enable cookies to view this embed.">
            <div className="card p-3">
              <div className="text-sm font-medium mb-2">Food — Local Favorite</div>
              <div className="overflow-hidden">
                <iframe
                  src="https://www.instagram.com/p/CsJb3xbL7Xy/embed"
                  width="400"
                  height="480"
                  frameBorder="0"
                  scrolling="no"
                  allowTransparency={true}
                />
              </div>
            </div>
          </ConsentGate>
        </div>
      </section>
    </main>
  );
}
