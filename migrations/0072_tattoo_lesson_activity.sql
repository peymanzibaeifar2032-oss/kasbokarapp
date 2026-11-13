-- Class app activity: which activation code opened or finished which lesson.
-- Additive only. Nothing existing is changed or removed; separate from bookings and the calendar.
create table if not exists tattoo_lesson_events (
  id text primary key,
  access_id text not null,
  code_id text not null,
  device_id text not null default '',
  lesson_id text not null,
  kind text not null check (kind in ('open', 'complete')),
  created_at timestamptz not null default now()
);

create index if not exists tattoo_lesson_events_code_idx on tattoo_lesson_events (code_id, kind, lesson_id);
create index if not exists tattoo_lesson_events_lesson_idx on tattoo_lesson_events (lesson_id, kind);
create index if not exists tattoo_lesson_events_access_idx on tattoo_lesson_events (access_id, lesson_id, created_at desc);
