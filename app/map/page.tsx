"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";

// Dynamically import Leaflet components (to avoid SSR issues)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

type Event = {
  id: string;
  title: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  starts_at: string | null;
  category: string | null;
};

export default function MapPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from("event_submissions")
        .select(
          "id, title, address, latitude, longitude, location_name, starts_at, category"
        )
        .eq("status", "approved")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (error) console.error(error);
      else setEvents(data || []);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  if (loading) return <p className="p-6 text-lg">Loading map…</p>;

  return (
    <div className="h-screen w-full">
      <MapContainer
        center={[38.7169, -9.1399]} // Center on Lisbon
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {events.map((ev) =>
          ev.latitude && ev.longitude ? (
            <Marker
              key={ev.id}
              position={[ev.latitude, ev.longitude]}
            >
              <Popup>
                <strong>{ev.title}</strong>
                <br />
                {ev.location_name || "Unknown venue"}
                <br />
                {ev.address}
                <br />
                {ev.starts_at
                  ? new Date(ev.starts_at).toLocaleDateString()
                  : ""}
                <br />
                {ev.category && (
                  <span className="text-sm text-gray-500">
                    {ev.category}
                  </span>
                )}
                <br />
                <a
                  href={`/event/${ev.id}`}
                  className="text-blue-600 underline"
                >
                  View details
                </a>
              </Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>
    </div>
  );
}
