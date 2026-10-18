create table if not exists personal_goal_categories (
  id text primary key,
  user_id text not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (user_id, label)
);

create table if not exists personal_goals (
  id text primary key,
  user_id text not null,
  title text not null,
  category text not null,
  why text not null default '',
  outcome text not null default '',
  success_metric text not null default '',
  start_date text not null,
  deadline text not null,
  original_deadline text not null,
  importance text not null default 'medium',
  kind text not null default 'main',
  estimate_hours numeric not null default 0,
  weekly_hours numeric not null default 0,
  status text not null default 'idea',
  blockers text not null default '',
  first_action text not null default '',
  postpone_count int not null default 0,
  archived boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists personal_goal_tasks (
  id text primary key,
  goal_id text not null references personal_goals (id) on delete cascade,
  user_id text not null,
  title text not null,
  detail text not null default '',
  start_date text not null default '',
  due_date text not null default '',
  estimate_hours numeric not null default 0,
  priority text not null default 'medium',
  status text not null default 'todo',
  result_note text not null default '',
  weight int not null default 1,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists personal_goal_actions (
  id text primary key,
  goal_id text not null references personal_goals (id) on delete cascade,
  task_id text,
  user_id text not null,
  day_key text not null,
  title text not null,
  planned_minutes int not null default 0,
  actual_minutes int not null default 0,
  done boolean not null default false,
  missed boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists personal_day_notes (
  user_id text not null,
  day_key text not null,
  note text not null default '',
  primary key (user_id, day_key)
);

create table if not exists personal_delay_reviews (
  id text primary key,
  user_id text not null,
  goal_id text not null references personal_goals (id) on delete cascade,
  task_id text,
  reason text not null,
  reason_note text not null default '',
  cause text not null default '',
  predictable text not null default '',
  change_note text not null default '',
  still_worth text not null default '',
  next_action text not null default '',
  new_deadline text not null default '',
  scope_change text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists personal_deadline_changes (
  id text primary key,
  user_id text not null,
  goal_id text not null references personal_goals (id) on delete cascade,
  previous_deadline text not null,
  next_deadline text not null,
  reason text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists personal_goal_events (
  id text primary key,
  user_id text not null,
  goal_id text,
  kind text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists personal_week_reviews (
  user_id text not null,
  week_start text not null,
  went_well text not null default '',
  blocked text not null default '',
  next_focus text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

create index if not exists personal_goals_user_idx on personal_goals (user_id, archived, status);
create index if not exists personal_goal_tasks_goal_idx on personal_goal_tasks (goal_id);
create index if not exists personal_goal_actions_user_day_idx on personal_goal_actions (user_id, day_key);
