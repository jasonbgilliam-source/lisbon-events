"use client";

import * as React from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

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

type UserLocation = {
  lat: number;
  lng: number;
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
    const existing = document.querySelector(
      'script[data-google-maps="1"]'
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps script"))
      );
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

export default function GoogleMap(props: {
  pins: Pin[];
  onPinClick: (pin: Pin) => void;
  userLocation?: UserLocation | null;
  centerToken?: number;
}) {
  const { pins, onPinClick, userLocation, centerToken } = props;

  const ref = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);
  const userMarkerRef = React.useRef<any>(null);
  const clustererRef = React.useRef<MarkerClusterer | null>(null);
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

        if (!mapRef.current) {
          mapRef.current = new window.google.maps.Map(ref.current, {
            center: { lat: 38.7223, lng: -9.1393 },
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
        }

        if (clustererRef.current) {
  clustererRef.current.clearMarkers();
  clustererRef.current = null;
        }

        for (const marker of markersRef.current) {
          marker.setMap(null);
        }
        markersRef.current = [];

        if (userMarkerRef.current) {
          userMarkerRef.current.setMap(null);
          userMarkerRef.current = null;
        }

        const bounds = new window.google.maps.LatLngBounds();
        let hasBounds = false;

        if (userLocation) {
          userMarkerRef.current = new window.google.maps.Marker({
            position: userLocation,
            map: mapRef.current,
            title: "Your location",
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#2563eb",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
            zIndex: 999,
          });

          bounds.extend(userLocation);
          hasBounds = true;
        }

        const markers = pins.map((p) => {
          const pos = { lat: p.latitude, lng: p.longitude };
          bounds.extend(pos);
          hasBounds = true;

          const marker = new window.google.maps.Marker({
            position: pos,
            title: p.title,
          });

          marker.addListener("click", () => {
            const slug = String(p.slug || "").trim();
            if (slug) {
              try {
                onPinClick(p);
              } catch {}
              window.location.href = `/events/${encodeURIComponent(slug)}`;
            } else {
              console.warn("Pin missing slug:", p);
            }
          });

          return marker;
        });

        markersRef.current = markers;

        if (markers.length > 0) {
          clustererRef.current = new MarkerClusterer({
            map: mapRef.current,
            markers,
          });
        }

        if (userLocation && markers.length === 0) {
          mapRef.current.setCenter(userLocation);
          mapRef.current.setZoom(13);
          return;
        }

        if (markers.length === 1 && !userLocation) {
          mapRef.current.setCenter({
            lat: pins[0].latitude,
            lng: pins[0].longitude,
          });
          mapRef.current.setZoom(14);
          return;
        }

        if (hasBounds) {
          mapRef.current.fitBounds(bounds);

          if (userLocation && markers.length > 0) {
            window.google.maps.event.addListenerOnce(
              mapRef.current,
              "bounds_changed",
              () => {
                const zoom = mapRef.current.getZoom?.();
                if (typeof zoom === "number" && zoom > 14) {
                  mapRef.current.setZoom(14);
                }
              }
            );
          }
        }
      })
      .catch((e: any) => {
        setErr(e?.message ?? "Failed to load map");
      });

    return () => {
      cancelled = true;
    };
  }, [pins, onPinClick, userLocation]);

  React.useEffect(() => {
    if (!mapRef.current || !userLocation || !window.google?.maps) return;
    mapRef.current.panTo(userLocation);
    const zoom = mapRef.current.getZoom?.();
    if (typeof zoom !== "number" || zoom < 13) {
      mapRef.current.setZoom(13);
    }
  }, [userLocation, centerToken]);

  return (
    <div className="w-full">
      {err ? (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-md p-3 text-sm">
          {err}
        </div>
      ) : (
        <div ref={ref} className="w-full h-[380px] rounded-lg border" />
      )}
    </div>
  );
}