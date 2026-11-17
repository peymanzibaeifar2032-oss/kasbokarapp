-- Chat extras for TattooHub. Existing posts and bookings stay untouched.
alter table tattoohub_messages add column if not exists image text not null default '';
alter table tattoohub_messages add column if not exists audio text not null default '';
alter table tattoohub_messages add column if not exists read_at timestamptz;

create table if not exists tattoohub_typing (
  user_id text not null,
  with_id text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, with_id)
);

create table if not exists tattoohub_story_replies (
  id text primary key,
  story_id text not null,
  user_id text not null,
  kind text not null,
  body text not null default '',
  created_at timestamptz not null default now()
);
