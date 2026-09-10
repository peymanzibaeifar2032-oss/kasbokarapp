create table if not exists bug_reports (
  id text primary key,
  user_id text,
  role text not null,
  page_url text not null,
  route_path text,
  intent text not null,
  expected_result text not null,
  actual_result text not null,
  device text,
  browser text,
  user_agent text,
  occurred_at timestamptz,
  reproducible boolean,
  steps text,
  severity text not null,
  status text not null default 'new',
  app_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bug_reports_severity_chk check (severity in ('low', 'medium', 'critical')),
  constraint bug_reports_status_chk check (status in ('new', 'reviewing', 'resolved', 'closed'))
);

create index if not exists bug_reports_status_idx on bug_reports (status, created_at desc);
create index if not exists bug_reports_user_idx on bug_reports (user_id);
