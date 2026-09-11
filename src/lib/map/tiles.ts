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
const ESRI_ATTR = "Tiles &copy; Esri";

/** Preview / Netlify backup only. Never the standalone Iran default. */
export const PUBLIC_OSM_TILES: MapTileConfig = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  fallbackUrl:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  attribution: OSM_ATTR,
  maxZoom: 19,
  proxy: false,
};

export const SAME_ORIGIN_PROXY: MapTileConfig = {
  url: "/api/tiles/{z}/{x}/{y}?v=2",
  attribution: ESRI_ATTR,
  maxZoom: 19,
  proxy: true,
};

/**
 * Default upstream for the VPS tile proxy when no MAP_TILE_* is set.
 * Browser talks only to this app. Swap via MAP_TILE_PROXY_UPSTREAM or MAP_TILE_URL
 * (Neshan, Map.ir, self-hosted). Not OSM.org.
 */
export const STANDALONE_DEFAULT_UPSTREAM =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";

/** Tried in order by the VPS proxy. Carto public basemaps watermark "API KEY REQUIRED". */
export const STANDALONE_UPSTREAM_CANDIDATES = [
  "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
  "https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
  "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
  STANDALONE_DEFAULT_UPSTREAM,
] as const;

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

function isStandaloneEnv(get: (key: string) => string | undefined): boolean {
  const v = get("STANDALONE")?.trim();
  return v === "true" || v === "1";
}

/**
 * Resolve tile layers from env. No provider is hardcoded into the UI.
 *
 * - MAP_TILE_URL — Leaflet template, e.g. Iranian Neshan/Map.ir or self-hosted
 * - MAP_TILE_URL_FALLBACK — optional second template
 * - MAP_TILE_PROXY_UPSTREAM — enable same-origin /api/tiles/{z}/{x}/{y}
 * - STANDALONE=true with no MAP_TILE_* — same-origin proxy (not OSM.org)
 */
export function resolveMapTiles(get: (key: string) => string | undefined): MapTileConfig {
  const proxyUp = get("MAP_TILE_PROXY_UPSTREAM")?.trim();
  const explicit = get("MAP_TILE_URL")?.trim();
  const fallback = get("MAP_TILE_URL_FALLBACK")?.trim();
  const attribution = get("MAP_TILE_ATTRIBUTION")?.trim();
  const maxZoom = Math.min(22, Math.max(1, Number(get("MAP_TILE_MAX_ZOOM")) || 19));
  const subdomains = get("MAP_TILE_SUBDOMAINS")?.trim() || undefined;

  if (proxyUp && isSafeTileTemplate(proxyUp)) {
    return {
      url: SAME_ORIGIN_PROXY.url,
      attribution: attribution || ESRI_ATTR,
      maxZoom,
      subdomains,
      proxy: true,
    };
  }

  if (isStandaloneEnv(get)) {
    return {
      ...SAME_ORIGIN_PROXY,
      attribution: attribution || ESRI_ATTR,
      maxZoom,
      subdomains,
    };
  }

  if (explicit && isSafeTileTemplate(explicit)) {
    return {
      url: explicit,
      fallbackUrl: fallback && isSafeTileTemplate(fallback) ? fallback : undefined,
      attribution: attribution || OSM_ATTR,
      maxZoom,
      subdomains,
      proxy: false,
    };
  }

  return { ...PUBLIC_OSM_TILES, attribution: attribution || OSM_ATTR, maxZoom };
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
