"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";

type Props = {
  category: string;
  audiencePreview?: string[]; // optional: e.g. ["All Ages", "Family"]
};

const AUDIENCE_ORDER = ["All Ages", "Family", "Kids", "Teens", "Adults"] as const;

function normalizeAudiencePreview(values?: string[]): string[] {
  if (!values || values.length === 0) return [];

  const set = new Set<string>();
  for (const v of values) {
    const s = String(v).trim();
    if (!s) continue;
    const match = AUDIENCE_ORDER.find((x) => x.toLowerCase() === s.toLowerCase());
    set.add(match ?? s);
  }

  if (set.has("All Ages")) return ["All Ages"];

  const known: string[] = [];
  const unknown: string[] = [];

  for (const v of set) {
    if ((AUDIENCE_ORDER as readonly string[]).includes(v)) known.push(v);
    else unknown.push(v);
  }

  known.sort(
    (a, b) =>
      (AUDIENCE_ORDER as readonly string[]).indexOf(a) -
      (AUDIENCE_ORDER as readonly string[]).indexOf(b)
  );
  unknown.sort((a, b) => a.localeCompare(b));

  return [...known, ...unknown].slice(0, 3); // keep it tight on tiles
}

export default function CategoryCard({ category, audiencePreview }: Props) {
  const slug = category.toLowerCase().replace(/\s+/g, "-");
  const image = `/images/${slug}.jpg`;

  const chips = normalizeAudiencePreview(audiencePreview);

  return (
    <Link
      href={`/categories/${slug}`}
      className="bg-[#fff8f3] border border-[#e1a46e] rounded-2xl shadow-sm hover:shadow-md transition p-3 flex flex-col items-center text-center"
    >
      <div className="relative w-full h-40 mb-3 rounded-lg overflow-hidden">
        <Image src={image} alt={category} fill style={{ objectFit: "cover" }} />
      </div>

      <h3 className="text-lg font-semibold text-[#b84b22]">{category}</h3>
      <p className="text-sm text-gray-600 italic">
        Explore what’s happening in {category}
      </p>

      {/* 👥 Audience preview chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {chips.map((a) => (
            <span
              key={a}
              className="bg-orange-50 text-[#c94917] text-xs font-semibold px-2 py-1 rounded-full border border-orange-200"
            >
              {a}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}