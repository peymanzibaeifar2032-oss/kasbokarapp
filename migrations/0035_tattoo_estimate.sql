alter table tattoo_requests drop constraint if exists tattoo_requests_type_chk;
alter table tattoo_requests add constraint tattoo_requests_type_chk
  check (request_type in ('new','coverup','consultation','custom','repair','continuation'));

alter table tattoo_requests add column if not exists body_side text;
alter table tattoo_requests add column if not exists size_mode text;
alter table tattoo_requests add column if not exists color_mode text;
alter table tattoo_requests add column if not exists styles jsonb not null default '[]'::jsonb;
alter table tattoo_requests add column if not exists estimate_min_toman int;
alter table tattoo_requests add column if not exists estimate_max_toman int;
alter table tattoo_requests add column if not exists estimate_minutes int;
alter table tattoo_requests add column if not exists estimate_sessions int;
alter table tattoo_requests add column if not exists complexity_score int;
alter table tattoo_requests add column if not exists estimate_confidence text;
alter table tattoo_requests add column if not exists is_price_anchor boolean not null default false;

create table if not exists tattoo_request_files (
  id text primary key,
  request_id text not null,
  kind text not null,
  data text not null,
  created_at timestamptz not null default now()
);
create index if not exists tattoo_request_files_request_idx on tattoo_request_files (request_id);

create table if not exists tattoo_price_feedback (
  id text primary key,
  request_id text not null,
  estimate_min int,
  estimate_max int,
  final_price int not null,
  verdict text not null,
  created_at timestamptz not null default now(),
  constraint tattoo_price_feedback_verdict_chk check (verdict in ('low','ok','high')),
  constraint tattoo_price_feedback_price_chk check (final_price > 0)
);

create table if not exists tattoo_price_anchors (
  id text primary key,
  owner_user_id text not null,
  title text not null,
  request_type text not null default 'new',
  placement text not null default '',
  style text not null default '',
  size_cm text not null default '',
  color_mode text not null default '',
  price_toman int not null,
  minutes int,
  created_at timestamptz not null default now(),
  constraint tattoo_price_anchors_price_chk check (price_toman > 0)
);
