-- TattooHub social posts. Separate from bookings, calendar and the class.
create table if not exists tattoohub_profiles (
  user_id text primary key,
  name text not null default '',
  bio text not null default '',
  city text not null default '',
  styles jsonb not null default '[]',
  avatar text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists tattoohub_posts (
  id text primary key,
  user_id text not null,
  caption text not null,
  image text not null default '',
  compare jsonb,
  style text not null default '',
  technique text not null default '',
  ink text not null default '',
  needle text not null default '',
  needle_type text not null default '',
  machine text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists tattoohub_posts_created_idx on tattoohub_posts (created_at desc);

create table if not exists tattoohub_likes (
  post_id text not null,
  user_id text not null,
  primary key (post_id, user_id)
);

create table if not exists tattoohub_comments (
  id text primary key,
  post_id text not null,
  user_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists tattoohub_comments_post_idx on tattoohub_comments (post_id, created_at);

create table if not exists tattoohub_stories (
  id text primary key,
  user_id text not null,
  body text not null default '',
  image text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists tattoohub_messages (
  id text primary key,
  from_id text not null,
  to_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists tattoohub_messages_pair_idx on tattoohub_messages (from_id, to_id, created_at);

create table if not exists tattoohub_tokens (
  token text primary key,
  user_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists tattoohub_collections (
  id text primary key,
  user_id text not null,
  name text not null,
  post_ids jsonb not null default '[]'
);
