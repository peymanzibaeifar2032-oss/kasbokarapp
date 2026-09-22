create table if not exists studio_apprentices (
  id text primary key,
  user_id text not null,
  slug text not null,
  name text not null,
  phone text not null,
  kind text not null default 'regular',
  default_slot_key text,
  sort_order int not null default 0,
  session_goal int not null default 10,
  sessions_done int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

alter table studio_apprentices drop constraint if exists studio_apprentices_kind_chk;
alter table studio_apprentices add constraint studio_apprentices_kind_chk
  check (kind in ('regular', 'substitute'));

create table if not exists studio_apprentice_slots (
  id text primary key,
  user_id text not null,
  day_key text not null,
  slot_key text not null,
  start_time text not null,
  end_time text not null,
  status text not null default 'planned',
  apprentice_id text references studio_apprentices (id) on delete set null,
  booking_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day_key, slot_key)
);

alter table studio_apprentice_slots drop constraint if exists studio_apprentice_slots_status_chk;
alter table studio_apprentice_slots add constraint studio_apprentice_slots_status_chk
  check (status in ('planned', 'present', 'absent', 'lunch'));

create index if not exists studio_apprentice_slots_day_idx
  on studio_apprentice_slots (user_id, day_key);
