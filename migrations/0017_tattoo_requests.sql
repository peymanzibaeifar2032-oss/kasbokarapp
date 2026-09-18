-- Tattoo project intake before appointment selection.
create table if not exists tattoo_requests (
  id text primary key,
  customer_id text not null,
  business_id text references businesses(id) on delete set null,
  booking_id text references bookings(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  request_type text not null,
  style text not null,
  idea text not null,
  placement text not null,
  size_cm text not null,
  preferred_dates text,
  budget_toman int,
  reference_images jsonb not null default '[]'::jsonb,
  body_images jsonb not null default '[]'::jsonb,
  status text not null default 'submitted',
  price_min_toman int,
  price_max_toman int,
  session_minutes int,
  session_count int,
  deposit_toman int,
  artist_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tattoo_requests_type_chk check (request_type in ('new','coverup','consultation')),
  constraint tattoo_requests_status_chk check (status in ('submitted','needs_info','approved','rejected','booked'))
);

create index if not exists tattoo_requests_customer_idx on tattoo_requests(customer_id, created_at desc);
create index if not exists tattoo_requests_status_idx on tattoo_requests(status, created_at desc);

