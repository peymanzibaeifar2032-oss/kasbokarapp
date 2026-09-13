-- Official Iran administrative divisions (amar.org.ir 1402). Rows are loaded by scripts/seed-geo.mjs.
create table if not exists geo_places (
  id text primary key,
  name_fa text not null,
  normalized_name text not null,
  type text not null check (type in ('province', 'county', 'district', 'city', 'rural_district', 'village')),
  province_id text,
  county_id text,
  district_id text,
  rural_district_id text,
  parent_id text,
  code text,
  slug text,
  latitude double precision,
  longitude double precision,
  is_active boolean not null default true
);

create index if not exists geo_places_norm_idx on geo_places (normalized_name);
create index if not exists geo_places_type_idx on geo_places (type);
create index if not exists geo_places_parent_idx on geo_places (parent_id);
create index if not exists geo_places_province_idx on geo_places (province_id);
create index if not exists geo_places_county_idx on geo_places (county_id);

alter table businesses add column if not exists location_id text;
