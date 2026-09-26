create table if not exists studio_customer_files (
  id text primary key,
  user_id text not null,
  contact_key text not null,
  skin_tone text not null default '',
  ink_hold text not null default '',
  fade text not null default '',
  alcohol text not null default '',
  sleep_note text not null default '',
  arrival text not null default '',
  pain text not null default '',
  healing text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, contact_key)
);

create index if not exists studio_customer_files_user_idx
  on studio_customer_files (user_id, contact_key);
