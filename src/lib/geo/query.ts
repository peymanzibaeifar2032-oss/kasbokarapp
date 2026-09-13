import type { Sql } from "@/lib/db";
import { normalizeFa } from "../search/normalize";
import { compactFa, GEO_TYPE_FA, placeContext, type GeoPlace, type GeoType } from "./places";

type PlaceRow = {
  id: string;
  name_fa: string;
  type: GeoType;
  province_id: string | null;
  county_id: string | null;
  district_id: string | null;
  rural_district_id: string | null;
  parent_id: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  province_name: string | null;
  county_name: string | null;
  district_name: string | null;
};

const SELECT = `
  p.id, p.name_fa, p.type, p.province_id, p.county_id, p.district_id, p.rural_district_id,
  p.parent_id, p.latitude, p.longitude,
  prov.name_fa as province_name,
  county.name_fa as county_name,
  dist.name_fa as district_name
`;

const JOINS = `
  from geo_places p
  left join geo_places prov on prov.id = coalesce(nullif(p.province_id, ''), p.id) and prov.type = 'province'
  left join geo_places county on county.id = p.county_id and county.type = 'county'
  left join geo_places dist on dist.id = p.district_id and dist.type = 'district'
`;

function num(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapPlace(row: PlaceRow): GeoPlace & { typeFa: string; context: string } {
  const place: GeoPlace = {
    id: row.id,
    nameFa: row.name_fa,
    type: row.type,
    provinceId: row.province_id,
    countyId: row.county_id,
    districtId: row.district_id,
    ruralDistrictId: row.rural_district_id,
    parentId: row.parent_id,
    provinceName: row.province_name,
    countyName: row.county_name,
    districtName: row.district_name,
    latitude: num(row.latitude),
    longitude: num(row.longitude),
  };
  return {
    ...place,
    typeFa: GEO_TYPE_FA[place.type],
    context: placeContext(place),
  };
}

export async function searchGeoPlaces(sql: Sql, raw: string, limit = 20) {
  const q = normalizeFa(raw);
  if (!q) {
    const rows = await sql.query<PlaceRow>(
      `select ${SELECT} ${JOINS}
       where p.type = 'province' and p.is_active = true
       order by p.name_fa
       limit 31`,
    );
    return rows.map(mapPlace);
  }
  const compact = compactFa(q);
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const clike = `%${compact.replace(/[%_]/g, "")}%`;
  const rows = await sql.query<PlaceRow>(
    `select ${SELECT} ${JOINS}
     where p.is_active = true
       and (
         p.normalized_name like $1
         or replace(p.normalized_name, ' ', '') like $2
       )
     order by
       case when replace(p.normalized_name, ' ', '') = $3 then 0
            when p.normalized_name = $4 then 1
            when replace(p.normalized_name, ' ', '') like $3 || '%' then 2
            when p.normalized_name like $4 || '%' then 3
            else 4 end,
       case p.type
         when 'city' then 0
         when 'county' then 1
         when 'province' then 2
         when 'district' then 3
         when 'village' then 4
         else 5 end,
       length(p.name_fa),
       p.name_fa
     limit $5`,
    [like, clike, compact, q, limit],
  );
  return rows.map(mapPlace);
}

export type PlaceFilter = {
  province: string | null;
  cities: string[] | null;
  origin: { lat: number; lng: number } | null;
  label: string;
};

export async function resolvePlaceFilter(sql: Sql, placeId: string): Promise<PlaceFilter | null> {
  const rows = await sql.query<PlaceRow>(`select ${SELECT} ${JOINS} where p.id = $1 limit 1`, [placeId]);
  const row = rows[0];
  if (!row) return null;
  const mapped = mapPlace(row);
  const origin =
    mapped.latitude != null && mapped.longitude != null
      ? { lat: mapped.latitude, lng: mapped.longitude }
      : null;
  if (row.type === "province") {
    return { province: row.name_fa, cities: null, origin, label: mapped.context };
  }
  const province = row.province_name;
  const cityNames = new Set<string>();
  if (row.type === "city") cityNames.add(row.name_fa);
  if (row.type === "county") cityNames.add(row.name_fa);
  const countyId = row.type === "county" ? row.id : row.county_id;
  if (countyId && row.type !== "city") {
    const cities = await sql.query<{ name_fa: string }>(
      `select name_fa from geo_places where type = 'city' and county_id = $1 and is_active = true`,
      [countyId],
    );
    for (const c of cities) cityNames.add(c.name_fa);
    const county = await sql.query<{ name_fa: string }>(
      `select name_fa from geo_places where id = $1 limit 1`,
      [countyId],
    );
    if (county[0]) cityNames.add(county[0].name_fa);
  }
  if (row.type === "city") {
    return { province, cities: [...cityNames], origin, label: mapped.context };
  }
  return {
    province,
    cities: cityNames.size ? [...cityNames] : null,
    origin,
    label: mapped.context,
  };
}

export function compactCityList(cities: string[]): string[] {
  return [...new Set(cities.flatMap((c) => [c, compactFa(c)].filter(Boolean)))];
}
