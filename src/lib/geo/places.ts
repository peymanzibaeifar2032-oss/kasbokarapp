import { normalizeFa } from "../search/normalize.ts";

export const GEO_TYPES = ["province", "county", "district", "city", "rural_district", "village"] as const;
export type GeoType = (typeof GEO_TYPES)[number];

export const GEO_TYPE_FA: Record<GeoType, string> = {
  province: "استان",
  county: "شهرستان",
  district: "بخش",
  city: "شهر",
  rural_district: "دهستان",
  village: "روستا",
};

export type GeoPlace = {
  id: string;
  nameFa: string;
  type: GeoType;
  provinceId: string | null;
  countyId: string | null;
  districtId: string | null;
  ruralDistrictId: string | null;
  parentId: string | null;
  provinceName?: string | null;
  countyName?: string | null;
  districtName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function compactFa(raw: string): string {
  return normalizeFa(raw).replace(/ /g, "");
}

export function placeMatchesQuery(name: string, q: string): boolean {
  const nq = normalizeFa(q);
  if (nq.length < 1) return true;
  const nn = normalizeFa(name);
  if (nn.includes(nq)) return true;
  const cq = compactFa(q);
  const cn = compactFa(name);
  if (cq.length >= 2 && cn.includes(cq)) return true;
  const tokens = nq.split(" ").filter((t) => t.length >= 2);
  return tokens.length > 0 && tokens.every((t) => cn.includes(compactFa(t)));
}

export function placeContext(place: GeoPlace): string {
  const name = place.nameFa;
  if (place.type === "province") return name;
  if (place.type === "county") return place.provinceName ? `${name} — ${place.provinceName}` : name;
  if (place.type === "city" || place.type === "district") {
    const bits = [place.countyName, place.provinceName].filter(Boolean);
    return bits.length ? `${name} — ${bits.join("، ")}` : name;
  }
  const bits = [place.districtName, place.countyName, place.provinceName].filter(Boolean);
  return bits.length ? `${name} — ${bits.join("، ")}` : name;
}

export function typeRank(type: GeoType): number {
  return { city: 0, county: 1, province: 2, district: 3, village: 4, rural_district: 5 }[type];
}
