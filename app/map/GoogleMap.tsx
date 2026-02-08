"use client";

import * as React from "react";

type Pin = {
  id: string;
  slug: string;
  title: string;
  starts_at: string | null;
  ends_at?: string | null;
  category?: string | null;
  latitude: number;
  longitude: number;
};

declare global {
  interface Window {
    google: any;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps="1"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps script")));
      return;
    }

    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    s.async = true;
    s.defer = true;
    s.setAttribute("data-google-maps", "1");
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(s);
  });
}

export default function GoogleMap(props: { pins: Pin[]; onPinClick: (pin: Pin) => void }) {
  const { pins, onPinClick } = props;

  const ref = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      setErr("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
      return;
    }

    let cancelled = false;

    loadGoogleMaps(key)
      .then(() => {
        if (cancelled) return;
        if (!ref.current) return;

        // Initialize once
        if (!mapRef.current) {
          mapRef.current = new window.google.maps.Map(ref.current, {
            center: { lat: 38.7223, lng: -9.1393 }, // Lisbon
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
        }

        // Clear old markers
        for (const m of markersRef.current) m.setMap(null);
        markersRef.current = [];

        if (!pins || pins.length === 0) return;

        const bounds = new window.google.maps.LatLngBounds();

        for (const p of pins) {
          const pos = { lat: p.latitude, lng: p.longitude };
          bounds.extend(pos);

          const marker = new window.google.maps.Marker({
            position: pos,
            map: mapRef.current,
            title: p.title,
          });

          marker.addListener("click", () => {
            // Always navigate reliably to /events/[slug]
            const slug = (p.slug || "").trim();
            if (slug) {
              // call callback (optional) + hard navigate (reliable)
              try {
                onPinClick(p);
              } catch {}
              window.location.href = `/events/${encodeURIComponent(slug)}`;
            } else {
              // no slug: at least show something in console
              // eslint-disable-next-line no-console
              console.warn("Pin missing slug:", p);
            }
          });

          markersRef.current.push(marker);
        }

        if (pins.length === 1) {
          mapRef.current.setCenter({ lat: pins[0].latitude, lng: pins[0].longitude });
          mapRef.current.setZoom(14);
        } else {
          mapRef.current.fitBounds(bounds);
        }
      })
      .catch((e: any) => {
        setErr(e?.message ?? "Failed to load map");
      });

    return () => {
      cancelled = true;
    };
  }, [pins, onPinClick]);

  return (
    <div className="w-full">
      {err ? (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-md p-3 text-sm">{err}</div>
      ) : (
        <div ref={ref} className="w-full h-[380px] rounded-lg border" />
      )}
    </div>
  );
}
