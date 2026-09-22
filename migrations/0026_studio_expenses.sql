create table if not exists studio_expenses (
  id text primary key,
  user_id text not null,
  category text not null,
  title text not null,
  amount_toman int not null check (amount_toman > 0),
  month_jy int not null,
  month_jm int not null check (month_jm between 1 and 12),
  recurring boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists studio_expenses_month_idx
  on studio_expenses (user_id, month_jy, month_jm);

create table if not exists studio_expense_templates (
  id text primary key,
  user_id text not null,
  category text not null,
  title text not null,
  amount_toman int not null check (amount_toman > 0),
  active boolean not null default true,
  unique (user_id, category, title)
);
