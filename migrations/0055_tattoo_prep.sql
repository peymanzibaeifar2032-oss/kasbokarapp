-- Text-only tattoo prep projects. Images stay on the artist's device.
create table if not exists tattoo_prep_projects (
  id text primary key,
  device_id text not null,
  name text not null,
  phone text not null default '',
  idea text not null default '',
  placement text not null default '',
  size_cm text not null default '',
  style text not null default '',
  color_mode text not null default 'bw',
  updated_at timestamptz not null default now()
);

create index if not exists tattoo_prep_projects_device_idx
  on tattoo_prep_projects (device_id, updated_at desc);
