import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Business } from "@/lib/types";

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
    const [url, setUrl] = useState("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    const switched = useRef(false);
    return (
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url={url}
        updateWhenZooming={false}
        maxZoom={19}
        eventHandlers={{
          tileerror: () => {
            if (switched.current) return;
            switched.current = true;
            setUrl("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}");
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
