-- People who can come the same day if a booked client cancels.
-- They do not pay until they are in the studio.
create table if not exists studio_fill_ins (
  id text primary key,
  owner_id text not null,
  customer_name text not null,
  customer_phone text not null,
  customer_phone_2 text,
  customer_instagram text,
  idea text not null,
  placement text not null default 'هماهنگ در استودیو',
  size_cm text,
  note text,
  status text not null default 'waiting',
  created_at timestamptz not null default now(),
  filled_at timestamptz
);

alter table studio_fill_ins drop constraint if exists studio_fill_ins_status_chk;
alter table studio_fill_ins add constraint studio_fill_ins_status_chk
  check (status in ('waiting', 'filled', 'dropped'));

create index if not exists studio_fill_ins_owner_idx on studio_fill_ins (owner_id, status, created_at desc);
