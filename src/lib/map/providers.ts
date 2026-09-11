export type MapProviderRole = "iran-primary" | "international-fallback" | "custom";

export type MapProviderDef = {
  id: string;
  role: MapProviderRole;
  template: string;
  attribution: string;
};

const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const ESRI_ATTR = "Tiles &copy; Esri";

export const ESRI_STREET_TEMPLATE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";

/** Esri remains the current adapter. Swap by env, not by rewriting callers. */
export const REGISTERED_MAP_PROVIDERS: MapProviderDef[] = [
  {
    id: "esri-street",
    role: "iran-primary",
    template: ESRI_STREET_TEMPLATE,
    attribution: ESRI_ATTR,
  },
  {
    id: "osm-de",
    role: "international-fallback",
    template: "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
    attribution: OSM_ATTR,
  },
  {
    id: "osm-fr",
    role: "international-fallback",
    template: "https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    attribution: OSM_ATTR,
  },
];

export function providerOrder(preferredId?: string): MapProviderDef[] {
  if (!preferredId) return REGISTERED_MAP_PROVIDERS;
  const hit = REGISTERED_MAP_PROVIDERS.find((p) => p.id === preferredId);
  if (!hit) return REGISTERED_MAP_PROVIDERS;
  return [hit, ...REGISTERED_MAP_PROVIDERS.filter((p) => p.id !== preferredId)];
}
