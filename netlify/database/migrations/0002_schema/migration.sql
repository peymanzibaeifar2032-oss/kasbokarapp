create table if not exists profiles (
  user_id text primary key,
  display_name text not null default 'کاربر',
  phone text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id serial primary key,
  name text not null,
  slug text not null unique,
  icon text not null default 'store',
  sort_order int not null default 0
);

create table if not exists businesses (
  id text primary key,
  owner_id text not null,
  name text not null,
  job_title text,
  phone text,
  province text not null,
  city text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  category_id int not null references categories (id),
  description text,
  instagram text,
  whatsapp text,
  website text,
  work_hours jsonb not null default '[]'::jsonb,
  slot_minutes int not null default 60,
  prices jsonb not null default '[]'::jsonb,
  approval_status text not null default 'pending',
  is_active boolean not null default true,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_owner_idx on businesses (owner_id);
create index if not exists businesses_cat_idx on businesses (category_id);
create index if not exists businesses_prov_idx on businesses (province);

create table if not exists bookings (
  id text primary key,
  business_id text not null references businesses (id) on delete cascade,
  customer_id text not null,
  customer_name text,
  customer_phone text,
  slot_start timestamptz not null,
  note text,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);

create index if not exists bookings_biz_idx on bookings (business_id);
create index if not exists bookings_cust_idx on bookings (customer_id);
