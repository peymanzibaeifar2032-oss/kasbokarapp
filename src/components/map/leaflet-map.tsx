import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Business } from "@/lib/types";
import { SAME_ORIGIN_PROXY, type MapTileConfig } from "@/lib/map/tiles";

type Props = {
  businesses: Business[];
  center: { lat: number; lng: number };
  zoom?: number;
  viewKey?: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  pickMode?: boolean;
  picked?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  onCenterChange?: (lat: number, lng: number) => void;
  userPos?: { lat: number; lng: number } | null;
  className?: string;
};

export function LeafletMap({
  businesses,
  center,
  zoom = 12,
  viewKey = 0,
  selectedId,
  onSelect,
  pickMode,
  picked,
  onPick,
  onCenterChange,
  userPos,
  className,
}: Props) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "kasb-divicon",
        html: `<span class="kasb-pin"></span>`,
        iconSize: [22, 32],
        iconAnchor: [11, 30],
      }),
    [],
  );
  const pickIcon = useMemo(
    () =>
      L.divIcon({
        className: "kasb-divicon",
        html: `<span class="kasb-pin kasb-pin-pick"></span>`,
        iconSize: [28, 40],
        iconAnchor: [14, 38],
      }),
    [],
  );

  function Recenter() {
    const map = useMap();
    useEffect(() => {
      map.setView([center.lat, center.lng], zoom, { animate: false });
    }, [map, viewKey]);
    return null;
  }

  function MapEvents() {
    const map = useMapEvents({
      click(e) {
        if (pickMode) onPick?.(e.latlng.lat, e.latlng.lng);
      },
      moveend() {
        const c = map.getCenter();
        onCenterChange?.(c.lat, c.lng);
      },
    });
    return null;
  }

  function Tiles() {
    const [cfg, setCfg] = useState<MapTileConfig | null>(null);
    const [url, setUrl] = useState<string | null>(null);
    const switched = useRef(false);

    useEffect(() => {
      let alive = true;
      void fetch("/api/map-config", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: MapTileConfig | null) => {
          if (!alive) return;
          const next = j?.url ? j : SAME_ORIGIN_PROXY;
          setCfg(next);
          setUrl(next.url);
          switched.current = false;
        })
        .catch(() => {
          if (!alive) return;
          setCfg(SAME_ORIGIN_PROXY);
          setUrl(SAME_ORIGIN_PROXY.url);
        });
      return () => {
        alive = false;
      };
    }, []);

    if (!cfg || !url) return null;

    return (
      <TileLayer
        attribution={cfg.attribution}
        url={url}
        subdomains={cfg.subdomains || "abc"}
        updateWhenZooming={false}
        maxZoom={cfg.maxZoom}
        eventHandlers={{
          tileerror: () => {
            if (switched.current || !cfg.fallbackUrl) return;
            switched.current = true;
            setUrl(cfg.fallbackUrl);
          },
        }}
      />
    );
  }

  return (
    <div dir="ltr" className={className ?? "h-full min-h-72 overflow-hidden rounded-xl border border-border"}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        className="h-full min-h-72 w-full"
        scrollWheelZoom
        zoomAnimation
        markerZoomAnimation={false}
      >
        <Tiles />
        <Recenter />
        <MapEvents />
        {businesses.map((b) => (
          <Marker
            key={b.id}
            position={[b.latitude, b.longitude]}
            icon={selectedId === b.id ? pickIcon : icon}
            eventHandlers={{ click: () => onSelect?.(b.id) }}
            zIndexOffset={selectedId === b.id ? 400 : 0}
          />
        ))}
        {picked && !pickMode ? <Marker position={[picked.lat, picked.lng]} icon={pickIcon} zIndexOffset={600} /> : null}
        {userPos ? (
          <CircleMarker
            center={[userPos.lat, userPos.lng]}
            radius={8}
            pathOptions={{ color: "#1c3d52", fillColor: "#2f6f68", fillOpacity: 0.35, weight: 2 }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
