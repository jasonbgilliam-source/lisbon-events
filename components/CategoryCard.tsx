'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

type Props = {
  category: string;
};

export default function CategoryCard({ category }: Props) {
  const slug = category.toLowerCase().replace(/\s+/g, '-');
  const image = `/images/${slug}.jpg`;

  return (
    <Link
      href={`/categories/${slug}`}
      className="bg-[#fff8f3] border border-[#e1a46e] rounded-2xl shadow-sm hover:shadow-md transition p-3 flex flex-col items-center text-center"
    >
      <div className="relative w-full h-40 mb-3 rounded-lg overflow-hidden">
        <Image
          src={image}
          alt={category}
          fill
          style={{ objectFit: 'cover' }}
        />
      </div>
      <h3 className="text-lg font-semibold text-[#b84b22]">{category}</h3>
      <p className="text-sm text-gray-600 italic">Explore what’s happening in {category}</p>
    </Link>
  );
}
