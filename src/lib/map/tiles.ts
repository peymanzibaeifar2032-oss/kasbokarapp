/** Provider-independent map tiles. Coordinates stay in our Postgres. */

export type MapTileConfig = {
  url: string;
  fallbackUrl?: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
  /** Same-origin proxy — browser never talks to OSM/ArcGIS/Neshan directly. */
  proxy: boolean;
};

const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Preview / Netlify backup only. Production in Iran must set MAP_TILE_URL or MAP_TILE_PROXY_UPSTREAM. */
export const PUBLIC_OSM_TILES: MapTileConfig = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  fallbackUrl:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  attribution: OSM_ATTR,
  maxZoom: 19,
  proxy: false,
};

const SAME_ORIGIN_PROXY: MapTileConfig = {
  url: "/api/tiles/{z}/{x}/{y}",
  attribution: OSM_ATTR,
  maxZoom: 19,
  proxy: true,
};

export function isSafeTileTemplate(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/api/tiles/")) return true;
  const probe = trimmed
    .replaceAll("{s}", "a")
    .replaceAll("{z}", "1")
    .replaceAll("{x}", "1")
    .replaceAll("{y}", "1");
  try {
    const u = new URL(probe);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Resolve tile layers from env. No provider is hardcoded into the UI.
 *
 * - MAP_TILE_URL — Leaflet template, e.g. Iranian Neshan/Map.ir or self-hosted
 * - MAP_TILE_URL_FALLBACK — optional second template
 * - MAP_TILE_PROXY_UPSTREAM — enable same-origin /api/tiles/{z}/{x}/{y}
 */
export function resolveMapTiles(get: (key: string) => string | undefined): MapTileConfig {
  const proxyUp = get("MAP_TILE_PROXY_UPSTREAM")?.trim();
  const explicit = get("MAP_TILE_URL")?.trim();
  const fallback = get("MAP_TILE_URL_FALLBACK")?.trim();
  const attribution = get("MAP_TILE_ATTRIBUTION")?.trim() || OSM_ATTR;
  const maxZoom = Math.min(22, Math.max(1, Number(get("MAP_TILE_MAX_ZOOM")) || 19));
  const subdomains = get("MAP_TILE_SUBDOMAINS")?.trim() || undefined;

  if (proxyUp && isSafeTileTemplate(proxyUp)) {
    return {
      url: SAME_ORIGIN_PROXY.url,
      fallbackUrl: explicit && isSafeTileTemplate(explicit) ? explicit : undefined,
      attribution,
      maxZoom,
      subdomains,
      proxy: true,
    };
  }

  if (explicit && isSafeTileTemplate(explicit)) {
    return {
      url: explicit,
      fallbackUrl: fallback && isSafeTileTemplate(fallback) ? fallback : undefined,
      attribution,
      maxZoom,
      subdomains,
      proxy: false,
    };
  }

  return { ...PUBLIC_OSM_TILES, attribution, maxZoom };
}

export function fillTileTemplate(
  template: string,
  z: number,
  x: number,
  y: number,
  s = "a",
): string {
  return template
    .replaceAll("{s}", s)
    .replaceAll("{z}", String(z))
    .replaceAll("{x}", String(x))
    .replaceAll("{y}", String(y));
}
