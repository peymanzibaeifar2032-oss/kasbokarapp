create table if not exists tattoo_lesson_groups (
  id text primary key,
  module_id text not null references tattoo_modules(id) on delete cascade,
  title text not null,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

alter table tattoo_lessons add column if not exists group_id text references tattoo_lesson_groups(id) on delete set null;

create index if not exists tattoo_lesson_groups_module_idx on tattoo_lesson_groups (module_id, "order");
create index if not exists tattoo_lessons_group_idx on tattoo_lessons (group_id, "order");
