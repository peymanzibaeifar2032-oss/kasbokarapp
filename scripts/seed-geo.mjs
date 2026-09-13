// @ts-nocheck
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";

const EXPECTED_MIN = 10000;
const TYPES = new Set(["province", "county", "district", "city", "rural_district", "village"]);

export function geoCsvPath() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../data/iran-geo.csv.gz"),
    join(process.cwd(), "data/iran-geo.csv.gz"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

function emptyToNull(v) {
  const s = (v ?? "").trim();
  return s.length ? s : null;
}

function numOrNull(v) {
  const s = (v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseLine(line) {
  return line.split(",");
}

async function readRows() {
  const path = geoCsvPath();
  if (!existsSync(path)) throw new Error(`geo dataset missing: ${path}`);
  const rows = [];
  const rl = createInterface({
    input: createReadStream(path).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  let header = null;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseLine(line);
    if (!header) {
      header = cols;
      continue;
    }
    const row = Object.fromEntries(header.map((k, i) => [k, cols[i] ?? ""]));
    if (!TYPES.has(row.type) || !row.id || !row.name_fa) continue;
    rows.push({
      id: row.id,
      name_fa: row.name_fa,
      normalized_name: row.normalized_name || row.name_fa,
      type: row.type,
      province_id: emptyToNull(row.province_id),
      county_id: emptyToNull(row.county_id),
      district_id: emptyToNull(row.district_id),
      rural_district_id: emptyToNull(row.rural_district_id),
      parent_id: emptyToNull(row.parent_id),
      code: emptyToNull(row.code),
      latitude: numOrNull(row.latitude),
      longitude: numOrNull(row.longitude),
    });
  }
  return rows;
}

export async function seedGeoPlaces(query) {
  const countRes = await query("select count(*)::int as n from geo_places");
  const n = Number(countRes[0]?.n ?? countRes.rows?.[0]?.n ?? 0);
  if (n >= EXPECTED_MIN) return { seeded: false, count: n };
  if (n > 0) await query("delete from geo_places");
  const rows = await readRows();
  const chunk = 200;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const values = [];
    const params = [];
    part.forEach((r, idx) => {
      const o = idx * 12;
      values.push(
        `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8},$${o + 9},$${o + 10},$${o + 11},$${o + 12})`,
      );
      params.push(
        r.id,
        r.name_fa,
        r.normalized_name,
        r.type,
        r.province_id,
        r.county_id,
        r.district_id,
        r.rural_district_id,
        r.parent_id,
        r.code,
        r.latitude,
        r.longitude,
      );
    });
    await query(
      `insert into geo_places (
        id, name_fa, normalized_name, type, province_id, county_id, district_id,
        rural_district_id, parent_id, code, latitude, longitude
      ) values ${values.join(",")}
      on conflict (id) do nothing`,
      params,
    );
  }
  const after = await query("select count(*)::int as n from geo_places");
  return { seeded: true, count: Number(after[0]?.n ?? after.rows?.[0]?.n ?? rows.length) };
}

export async function seedGeoPlacesPg(client) {
  return seedGeoPlaces(async (text, params = []) => {
    const res = await client.query(text, params);
    return res.rows;
  });
}
