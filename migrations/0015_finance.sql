-- Marketplace financial core. Non-destructive. No fake paid rows.
-- Existing trial/subscription, bookings, users stay.

alter table bookings add column if not exists finance_status text not null default 'no_payment_required';
alter table bookings drop constraint if exists bookings_finance_status_chk;
alter table bookings add constraint bookings_finance_status_chk
  check (finance_status in (
    'no_payment_required','awaiting_payment','deposit_paid','fully_paid',
    'payment_failed','refunded','partially_refunded'
  ));

alter table payments add column if not exists customer_id text;
alter table payments add column if not exists business_id text;
alter table payments add column if not exists provider_payment_id text;
alter table payments add column if not exists internal_reference text;
alter table payments add column if not exists purpose text not null default 'booking';
alter table payments add column if not exists redirected_at timestamptz;
alter table payments add column if not exists verified_at timestamptz;
alter table payments add column if not exists failed_at timestamptz;
alter table payments add column if not exists refunded_at timestamptz;
alter table payments add column if not exists idempotency_key text;
alter table payments add column if not exists commission_snapshot jsonb not null default '{}'::jsonb;
alter table payments add column if not exists amount_irr int;
alter table payments add column if not exists currency_display text not null default 'IRT';

update payments set amount_irr = amount * 10 where amount_irr is null;
alter table payments alter column amount_irr set default 0;

create unique index if not exists payments_internal_ref_uidx on payments (internal_reference) where internal_reference is not null;
create unique index if not exists payments_idempotency_uidx on payments (idempotency_key) where idempotency_key is not null;
create unique index if not exists payments_provider_payment_uidx on payments (provider, provider_payment_id)
  where provider is not null and provider_payment_id is not null;

do $$
declare c text;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'payments' and con.contype = 'c'
  loop
    execute format('alter table payments drop constraint if exists %I', c);
  end loop;
end $$;

alter table payments add constraint payments_status_chk
  check (status in ('created','pending','redirected','paid','failed','cancelled','refunded','partially_refunded'));
alter table payments add constraint payments_amount_chk check (amount >= 0);
alter table payments add constraint payments_amount_irr_chk check (amount_irr >= 0);

create table if not exists ledger_accounts (
  code text primary key,
  name text not null,
  kind text not null,
  check (kind in ('asset','liability','revenue','expense','equity'))
);

insert into ledger_accounts (code, name, kind) values
  ('customer_clearing', 'تسویه پرداخت مشتری', 'asset'),
  ('provider_clearing', 'تسویه درگاه', 'asset'),
  ('business_payable', 'بدهی به کسب‌وکار', 'liability'),
  ('platform_commission', 'درآمد کارمزد کسب‌وکار', 'revenue'),
  ('refund_liability', 'بدهی استرداد', 'liability'),
  ('deposit_held', 'بیعانه نزد پلتفرم', 'liability'),
  ('settlement_clearing', 'تسویه در جریان', 'liability'),
  ('platform_credit', 'اعتبار پلتفرم', 'equity'),
  ('provider_fees', 'کارمزد درگاه', 'expense'),
  ('adjustments', 'اصلاحات', 'equity')
on conflict (code) do nothing;

create table if not exists ledger_transactions (
  id text primary key,
  kind text not null,
  booking_id text,
  payment_id text,
  settlement_id text,
  business_id text,
  idempotency_key text not null,
  memo text,
  created_at timestamptz not null default now(),
  unique (idempotency_key)
);

create index if not exists ledger_tx_biz_idx on ledger_transactions (business_id, created_at desc);

create table if not exists ledger_entries (
  id text primary key,
  transaction_id text not null references ledger_transactions (id),
  account_code text not null references ledger_accounts (code),
  party_id text,
  debit_irr int not null default 0,
  credit_irr int not null default 0,
  created_at timestamptz not null default now(),
  check (debit_irr >= 0 and credit_irr >= 0),
  check (not (debit_irr > 0 and credit_irr > 0)),
  check (debit_irr > 0 or credit_irr > 0)
);

create index if not exists ledger_entries_tx_idx on ledger_entries (transaction_id);
create index if not exists ledger_entries_party_idx on ledger_entries (account_code, party_id);

create table if not exists commission_rules (
  id text primary key,
  scope text not null,
  scope_id text,
  percent_bps int not null default 0,
  fixed_irr int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (scope in ('platform','business','category','service')),
  check (percent_bps >= 0 and percent_bps <= 10000),
  check (fixed_irr >= 0)
);

create unique index if not exists commission_rules_scope_uidx on commission_rules (scope, coalesce(scope_id, ''));

insert into commission_rules (id, scope, scope_id, percent_bps, fixed_irr, active)
values ('rule-platform-default', 'platform', null, 500, 0, true)
on conflict do nothing;

create table if not exists business_settlement_accounts (
  business_id text primary key references businesses (id) on delete cascade,
  iban text not null,
  owner_name text not null,
  verification_status text not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (verification_status in ('unverified','pending','verified','rejected'))
);

create table if not exists settlements (
  id text primary key,
  business_id text not null references businesses (id),
  amount_irr int not null,
  currency text not null default 'IRR',
  provider text,
  internal_track_id text not null unique,
  provider_settlement_id text,
  destination_iban text not null,
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  provider_reference text,
  failure_reason text,
  receipt_reference text,
  idempotency_key text unique,
  check (amount_irr > 0),
  check (status in ('requested','queued','submitted','processing','completed','failed','cancelled'))
);

create index if not exists settlements_biz_idx on settlements (business_id, requested_at desc);

create table if not exists settlement_batch_items (
  id text primary key,
  batch_id text not null,
  settlement_id text not null references settlements (id),
  business_id text not null,
  amount_irr int not null,
  iban text not null,
  track_id text not null unique,
  status text not null default 'queued',
  failure_reason text
);

create table if not exists finance_audit (
  id text primary key,
  actor_id text,
  action text not null,
  target_type text not null,
  target_id text,
  before_safe jsonb,
  after_safe jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists finance_audit_idx on finance_audit (created_at desc);

create table if not exists provider_events (
  id text primary key,
  provider text not null,
  event_id text,
  kind text not null,
  payment_id text,
  settlement_id text,
  payload_safe jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists provider_events_uidx on provider_events (provider, event_id) where event_id is not null;
