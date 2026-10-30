-- Tattoo school. Separate from bookings, requests, and the calendar.
create table if not exists tattoo_modules (
  id text primary key,
  title text not null,
  description text not null default '',
  "order" integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tattoo_lessons (
  id text primary key,
  module_id text not null references tattoo_modules(id) on delete cascade,
  title text not null,
  content text not null default '',
  "order" integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tattoo_lessons_module_idx on tattoo_lessons (module_id, "order");

create table if not exists tattoo_lesson_images (
  id text primary key,
  lesson_id text not null references tattoo_lessons(id) on delete cascade,
  image_path text not null,
  image_data text not null,
  caption text not null default '',
  "order" integer not null default 0
);

create index if not exists tattoo_lesson_images_lesson_idx on tattoo_lesson_images (lesson_id, "order");

create table if not exists tattoo_activation_codes (
  id text primary key,
  code text not null unique,
  max_devices integer not null default 1,
  used_count integer not null default 0,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  note text not null default ''
);

create table if not exists tattoo_user_access (
  id text primary key,
  code_id text not null references tattoo_activation_codes(id) on delete cascade,
  device_id text not null,
  token_hash text not null unique,
  activated_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  is_blocked boolean not null default false,
  unique (code_id, device_id)
);

create table if not exists tattoo_questions (
  id text primary key,
  access_id text references tattoo_user_access(id) on delete set null,
  device_id text not null default '',
  lesson_id text references tattoo_lessons(id) on delete set null,
  question_text text not null,
  answer_text text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create index if not exists tattoo_questions_status_idx on tattoo_questions (status, created_at desc);

create table if not exists tattoo_learn_log (
  id text primary key,
  kind text not null,
  code_id text,
  device_id text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now()
);
