"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MapPin = {
  id: number | string;
  slug: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  category: string | null;
  location_name: string | null;
  city: string | null;
  address: string | null;
  image_url: string | null;
  latitude: number;
  longitude: number;
};

type ApiResponse = {
  ok: boolean;
  pins: MapPin[];
  error?: string;
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso || "";
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window !== "undefined" && (window as any).google?.maps) return Promise.resolve();

  const existing = document.getElementById("google-maps-js");
  if (existing) {
    return new Promise((resolve, reject) => {
      const t = setInterval(() => {
        if ((window as any).google?.maps) {
          clearInterval(t);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(t);
        reject(new Error("Timed out loading Google Maps JS"));
      }, 15000);
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "google-maps-js";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps JS"));
    document.head.appendChild(script);
  });
}

export default function MapPage() {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<string>("");

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<string>("");

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const infoRef = useRef<any>(null);

  const markersRef = useRef<any[]>([]);
  const clusterRef = useRef<any>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  // Fetch pins
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (category) qs.set("category", category);

        const res = await fetch(`/api/events/map-pins?${qs.toString()}`, { cache: "no-store" });
        const json = (await res.json()) as ApiResponse;

        if (!res.ok || !json.ok) throw new Error(json?.error || `Failed to load pins (${res.status})`);
        if (!cancelled) setPins(json.pins || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load pins");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [category]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of pins) if (p.category) set.add(p.category);
    return Array.from(set).sort();
  }, [pins]);

  // Init Google Map once
  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapDivRef.current) return;

      if (!apiKey) {
        setError("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. Add it to .env.local and restart the dev server.");
        return;
      }

      try {
        await loadGoogleMaps(apiKey);
        if (cancelled) return;

        const g = (window as any).google;
        const lisbon = { lat: 38.7223, lng: -9.1393 };

        mapRef.current = new g.maps.Map(mapDivRef.current, {
          center: lisbon,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        infoRef.current = new g.maps.InfoWindow();
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to initialize map");
      }
    }

    initMap();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // Update markers + clustering whenever pins change
  useEffect(() => {
    const g = (window as any).google;
    const map = mapRef.current;
    if (!g?.maps || !map) return;

    // Clear existing cluster + markers
    try {
      if (clusterRef.current) clusterRef.current.clearMarkers();
    } catch {}
    clusterRef.current = null;

    for (const m of markersRef.current) {
      try {
        m.setMap(null);
      } catch {}
    }
    markersRef.current = [];

    // Create markers
    for (const p of pins) {
      const marker = new g.maps.Marker({
        position: { lat: p.latitude, lng: p.longitude },
        title: p.title,
      });

      marker.addListener("click", () => {
        const when = p.starts_at ? fmtDateTime(p.starts_at) : "";
        const whereParts = [p.location_name, p.address, p.city].filter(Boolean);
        const where = whereParts.join(" • ");
        const href = `/events/${p.slug}`;

        const html = `
          <div style="max-width:260px">
            <div style="font-weight:700; margin-bottom:4px">${escapeHtml(p.title)}</div>
            ${when ? `<div style="opacity:.8; font-size:12px; margin-bottom:4px">${escapeHtml(when)}</div>` : ""}
            ${where ? `<div style="opacity:.8; font-size:12px; margin-bottom:8px">${escapeHtml(where)}</div>` : ""}
            <a href="${href}" style="font-weight:600">View details</a>
          </div>
        `;

        infoRef.current.setContent(html);
        infoRef.current.open(map, marker);
      });

      markersRef.current.push(marker);
    }

    // Fit bounds (based on raw markers)
    if (pins.length > 0) {
      const bounds = new g.maps.LatLngBounds();
      for (const p of pins) bounds.extend({ lat: p.latitude, lng: p.longitude });
      map.fitBounds(bounds);
      if (pins.length === 1) map.setZoom(14);
    }

    // Cluster markers (dynamic import so it stays client-only)
    (async () => {
      const { MarkerClusterer } = await import("@googlemaps/markerclusterer");
      // MarkerClusterer can accept markers not yet attached to the map; it will manage them.
      clusterRef.current = new MarkerClusterer({ map, markers: markersRef.current });
    })();
  }, [pins]);

  // Center map on user location (explicit button)
  useEffect(() => {
    const g = (window as any).google;
    const map = mapRef.current;
    if (!g?.maps || !map) return;
    if (!userLocation) return;

    map.panTo(userLocation);
    map.setZoom(13);
  }, [userLocation]);

  function handleUseMyLocation() {
    setLocStatus("");
    if (!navigator.geolocation) {
      setLocStatus("Geolocation not supported in this browser.");
      return;
    }

    setLocStatus("Requesting location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("Location set.");
      },
      (err) => {
        setLocStatus(err?.message || "Location permission denied.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Map</h1>
      <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.8 }}>
        Lisbon-only map view (pins come from approved future events with lat/lng).
      </p>

      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: "6px 10px" }}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={handleUseMyLocation}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Use my location
        </button>

        {locStatus ? <span style={{ opacity: 0.8 }}>{locStatus}</span> : null}
        {userLocation ? (
          <span style={{ opacity: 0.8 }}>
            ({userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)})
          </span>
        ) : null}
      </div>

      {loading ? <p>Loading pins…</p> : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        <div style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Events ({pins.length})</h2>

          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            {pins.map((p) => (
              <a
                key={p.id}
                href={`/events/${p.slug}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 12,
                  padding: 10,
                  display: "block",
                }}
              >
                <div style={{ fontWeight: 700 }}>{p.title}</div>
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                  {fmtDateTime(p.starts_at)}
                  {p.location_name ? ` • ${p.location_name}` : ""}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                </div>
              </a>
            ))}

            {!loading && pins.length === 0 ? (
              <div style={{ opacity: 0.75 }}>
                No pins found. (You need approved future events with lat/lng and a slug.)
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, marginBottom: 10 }}>Map view</h2>
          <div
            ref={mapDivRef}
            style={{
              height: 520,
              borderRadius: 12,
              background: "rgba(0,0,0,0.04)",
            }}
          />
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            Markers are clustered for performance. Click a marker or cluster to zoom in.
          </div>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
