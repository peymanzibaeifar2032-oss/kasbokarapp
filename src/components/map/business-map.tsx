import { useEffect, useState, type ComponentType } from "react";
import type { Business } from "@/lib/types";

export type MapProps = {
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

export function BusinessMap(props: MapProps) {
  const [Map, setMap] = useState<ComponentType<MapProps> | null>(null);
  useEffect(() => {
    let alive = true;
    void import("./leaflet-map").then((mod) => {
      if (alive) setMap(() => mod.LeafletMap);
    });
    return () => {
      alive = false;
    };
  }, []);
  if (!Map) {
    return (
      <div className="grid h-full min-h-72 place-items-center rounded-xl border border-border bg-surface text-sm text-muted">
        در حال بارگذاری نقشه…
      </div>
    );
  }
  return <Map {...props} />;
}
