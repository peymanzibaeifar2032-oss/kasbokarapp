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
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => {
      if (alive) setErr("نقشه دیر بارگذاری شد. دوباره بزنید.");
    }, 12000);
    void import("./leaflet-map")
      .then((mod) => {
        if (alive) {
          setErr(null);
          setMap(() => mod.LeafletMap);
        }
      })
      .catch(() => {
        if (alive) setErr("بارگذاری نقشه انجام نشد. اتصال را بررسی کنید.");
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [tick]);
  if (err && !Map) {
    return (
      <div className="grid h-full min-h-72 place-items-center rounded-xl border border-border bg-surface p-4 text-center text-sm text-muted">
        <div>
          <p>{err}</p>
          <button
            type="button"
            className="mt-3 h-10 rounded-full border border-border px-4 text-fg"
            onClick={() => {
              setErr(null);
              setTick((n) => n + 1);
            }}
          >
            تلاش دوباره
          </button>
        </div>
      </div>
    );
  }
  if (!Map) {
    return (
      <div className="grid h-full min-h-72 place-items-center rounded-xl border border-border bg-surface text-sm text-muted">
        در حال بارگذاری نقشه…
      </div>
    );
  }
  return <Map {...props} />;
}
