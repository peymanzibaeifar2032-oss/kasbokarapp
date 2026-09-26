alter table studio_apprentices add column if not exists debt_toman int not null default 0;

create table if not exists studio_apprentice_payments (
  id text primary key,
  user_id text not null,
  apprentice_id text not null references studio_apprentices (id) on delete cascade,
  amount_toman int not null check (amount_toman > 0),
  paid_on date not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists studio_apprentice_payments_idx
  on studio_apprentice_payments (user_id, apprentice_id, paid_on);
