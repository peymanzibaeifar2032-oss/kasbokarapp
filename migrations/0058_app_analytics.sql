-- App analytics for pocket booking (owner-only reports). Real events only.

create table if not exists app_devices (
  install_id text primary key,
  account_email text,
  user_id text,
  platform text not null default 'android',
  app_version text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists app_devices_email_idx on app_devices (lower(account_email));
create index if not exists app_devices_user_idx on app_devices (user_id);

create table if not exists app_download_events (
  id text primary key,
  file_name text not null,
  install_id text,
  user_id text,
  account_email text,
  downloaded_at timestamptz not null default now()
);

create index if not exists app_download_events_file_idx on app_download_events (file_name, downloaded_at desc);

-- Monthly cash totals reported by each account (Jalali year/month). Source of truth for owner revenue table.
create table if not exists app_revenue_months (
  user_id text,
  account_email text not null,
  jy integer not null,
  jm integer not null,
  income_toman bigint not null default 0,
  expense_toman bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (account_email, jy, jm)
);

create index if not exists app_revenue_months_jy_jm_idx on app_revenue_months (jy desc, jm desc);
