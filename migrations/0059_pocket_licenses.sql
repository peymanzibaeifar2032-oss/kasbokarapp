-- Pocket app manual licensing (owner-issued activation codes + signed offline leases). Additive only.
-- Private signing keys are stored ONLY AES-256-GCM wrapped with a key derived from the server's runtime
-- secret; no client/table API reads this table. Activation codes are stored only as keyed HMAC hashes.

create table if not exists pocket_license_signing_keys (
  kid text primary key,
  slot text not null unique,
  public_key_spki text not null,
  private_key_wrapped text not null,
  created_at timestamptz not null default now()
);

create table if not exists pocket_licenses (
  id text primary key,
  owner_user_id text not null,
  label text not null,
  code_hash text unique,
  is_self boolean not null default false,
  self_user_id text,
  status text not null default 'active' check (status in ('active', 'revoked')),
  valid_from timestamptz not null default now(),
  expires_at timestamptz not null,
  max_devices integer not null default 1 check (max_devices between 1 and 20),
  active_devices integer not null default 0 check (active_devices >= 0),
  offline_lease_hours integer not null default 72 check (offline_lease_hours between 1 and 168),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index if not exists pocket_licenses_self_idx on pocket_licenses (self_user_id) where is_self;
create index if not exists pocket_licenses_owner_idx on pocket_licenses (owner_user_id, created_at desc);

create table if not exists pocket_license_activations (
  id text primary key,
  license_id text not null references pocket_licenses (id),
  device_hash text not null,
  device_label text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  released_at timestamptz
);

create unique index if not exists pocket_license_activations_live_idx
  on pocket_license_activations (license_id, device_hash) where released_at is null;
