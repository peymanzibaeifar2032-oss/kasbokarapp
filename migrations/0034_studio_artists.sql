create table if not exists studio_artists (
  id text primary key,
  owner_user_id text not null,
  email text not null,
  name text not null,
  phone text,
  deal text not null,
  percent int not null default 0,
  amount_toman int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table studio_artists drop constraint if exists studio_artists_deal_chk;
alter table studio_artists add constraint studio_artists_deal_chk
  check (deal in ('percent', 'daily', 'weekly'));

create unique index if not exists studio_artists_email_uidx on studio_artists (lower(email));

alter table tattoo_requests add column if not exists artist_id text;
alter table bookings add column if not exists artist_id text;
create index if not exists tattoo_requests_artist_idx on tattoo_requests (artist_id);
create index if not exists bookings_artist_idx on bookings (artist_id);
