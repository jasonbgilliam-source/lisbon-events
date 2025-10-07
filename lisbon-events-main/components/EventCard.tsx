'use client';
import React from 'react';
import Microlink from '@microlink/react';
import Image from 'next/image';

type EventProps = {
  event: {
    title: string;
    start: string;
    end?: string;
    all_day?: boolean;
    venue?: string;
    city?: string;
    address?: string;
    price?: string;
    age?: string;
    category?: string;
    description?: string;
    organizer?: string;
    source_url?: string;
    tags?: string;
  };
};

export default function EventCard({ event }: EventProps) {
  const startDate = new Date(event.start);
  const formattedDate = startDate.toLocaleDateString('en-PT', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const fallbackImage = `/images/${event.category?.toLowerCase() || 'default'}.jpg`;

  return (
    <div className="bg-[#fff8f3] border border-[#e1a46e] rounded-2xl shadow-sm hover:shadow-md transition p-4 flex flex-col">
      {event.source_url ? (
        <div className="rounded-lg overflow-hidden mb-3">
          <Microlink url={event.source_url} size="large" />
        </div>
      ) : (
        <div className="relative w-full h-48 mb-3 rounded-lg overflow-hidden">
          <Image
            src={fallbackImage}
            alt={event.category || 'Lisbon Event'}
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#b84b22] mb-1">{event.title}</h2>
          <p className="text-sm text-gray-700 mb-2">{formattedDate}</p>
          <p className="text-sm text-gray-800 mb-2">
            {event.venue ? `${event.venue}, ${event.city}` : event.city}
          </p>
          <p className="text-sm text-gray-600">{event.description}</p>
        </div>

        <div className="mt-3 text-sm text-gray-500 italic">
          {event.price && <span>💶 {event.price} &nbsp;</span>}
          {event.age && <span>🎟 {event.age}</span>}
        </div>
      </div>
    </div>
  );
}
