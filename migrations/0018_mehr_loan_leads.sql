-- Independent lead intake for Erfan Haghshenoo's Mehr Iran loan-score desk.
create table if not exists mehr_loan_leads (
  id text primary key,
  tracking_code text not null unique,
  full_name text not null,
  phone text not null,
  score_amount_toman bigint,
  repayment_months int,
  city text,
  description text,
  status text not null default 'reviewing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mehr_loan_leads_status_chk check (status in ('reviewing','contacted','purchased','rejected')),
  constraint mehr_loan_leads_repayment_chk check (repayment_months is null or repayment_months between 1 and 120)
);

create index if not exists mehr_loan_leads_status_created_idx
  on mehr_loan_leads(status, created_at desc);
