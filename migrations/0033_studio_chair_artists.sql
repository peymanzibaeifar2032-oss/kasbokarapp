create table if not exists studio_chair_artists (
  id text primary key,
  owner_user_id text not null,
  name text not null,
  email text not null,
  phone text not null default '',
  rent_model text not null default 'percent',
  percent_shop int not null default 30,
  flat_period text not null default 'month',
  flat_amount_toman bigint not null default 0,
  started_at timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (owner_user_id, email)
);

alter table studio_chair_artists drop constraint if exists studio_chair_artists_model_chk;
alter table studio_chair_artists add constraint studio_chair_artists_model_chk
  check (rent_model in ('percent', 'flat'));

alter table studio_chair_artists drop constraint if exists studio_chair_artists_period_chk;
alter table studio_chair_artists add constraint studio_chair_artists_period_chk
  check (flat_period in ('day', 'week', 'month'));

create index if not exists studio_chair_artists_email_idx
  on studio_chair_artists (email);

create table if not exists studio_chair_jobs (
  id text primary key,
  owner_user_id text not null,
  artist_id text not null references studio_chair_artists (id) on delete cascade,
  customer_name text not null,
  customer_phone text not null default '',
  idea text not null default '',
  price_toman bigint not null default 0,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table studio_chair_jobs drop constraint if exists studio_chair_jobs_status_chk;
alter table studio_chair_jobs add constraint studio_chair_jobs_status_chk
  check (status in ('planned', 'done', 'cancelled'));

create index if not exists studio_chair_jobs_artist_idx
  on studio_chair_jobs (artist_id, slot_start);

create table if not exists studio_chair_rent_payments (
  id text primary key,
  owner_user_id text not null,
  artist_id text not null references studio_chair_artists (id) on delete cascade,
  amount_toman bigint not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists studio_chair_rent_payments_artist_idx
  on studio_chair_rent_payments (artist_id, created_at);
