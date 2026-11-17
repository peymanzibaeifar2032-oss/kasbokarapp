-- Social graph and professional profiles. Bookings and the class are untouched.
alter table tattoohub_profiles add column if not exists cover text not null default '';
alter table tattoohub_profiles add column if not exists artist_name text not null default '';
alter table tattoohub_profiles add column if not exists country text not null default '';
alter table tattoohub_profiles add column if not exists studio text not null default '';
alter table tattoohub_profiles add column if not exists contact text not null default '';
alter table tattoohub_profiles add column if not exists links text not null default '';
alter table tattoohub_profiles add column if not exists role text not null default 'artist';
alter table tattoohub_profiles add column if not exists gear text not null default '';
alter table tattoohub_profiles add column if not exists years text not null default '';
alter table tattoohub_profiles add column if not exists note text not null default '';
alter table tattoohub_profiles add column if not exists verified boolean not null default false;

alter table tattoohub_posts add column if not exists images jsonb not null default '[]';
alter table tattoohub_posts add column if not exists collab text not null default '';
alter table tattoohub_posts add column if not exists practice boolean not null default false;
alter table tattoohub_posts add column if not exists mentor_id text not null default '';

alter table tattoohub_comments add column if not exists parent_id text not null default '';

create table if not exists tattoohub_follows (
  follower_id text not null,
  following_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create table if not exists tattoohub_blocks (
  blocker_id text not null,
  blocked_id text not null,
  primary key (blocker_id, blocked_id)
);

create table if not exists tattoohub_reports (
  id text primary key,
  reporter_id text not null,
  target_type text not null,
  target_id text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists tattoohub_notifications (
  id text primary key,
  user_id text not null,
  kind text not null,
  actor_id text not null,
  ref_id text not null default '',
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tattoohub_notifications_user_idx on tattoohub_notifications (user_id, created_at desc);

create table if not exists tattoohub_highlights (
  id text primary key,
  user_id text not null,
  title text not null,
  image text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists tattoohub_mentors (
  apprentice_id text not null,
  mentor_id text not null,
  status text not null default 'pending',
  primary key (apprentice_id, mentor_id)
);
