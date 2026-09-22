-- Installment ledger and monthly work list for tattoo jobs.
alter table tattoo_requests add column if not exists paid_toman int not null default 0;
alter table tattoo_requests add column if not exists settled boolean not null default false;

create table if not exists tattoo_payments (
  id text primary key,
  request_id text not null references tattoo_requests(id) on delete cascade,
  amount_toman int not null check (amount_toman > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists tattoo_payments_request_idx
  on tattoo_payments (request_id, created_at);

update tattoo_requests
   set paid_toman = coalesce(deposit_toman, 0)
 where payment_status = 'approved'
   and paid_toman = 0
   and coalesce(deposit_toman, 0) > 0;

update tattoo_requests
   set settled = true
 where settled = false
   and coalesce(price_min_toman, 0) > 0
   and paid_toman >= price_min_toman;
