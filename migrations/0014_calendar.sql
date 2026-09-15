-- Professional calendar: special hours, notifications, waitlist, audit, holds,
-- attachments architecture, payments architecture, buffers, manual source.
-- Non-destructive. Existing bookings/users stay. Exclusion remains the lock.

alter table bookings add column if not exists source text not null default 'online';
alter table bookings add column if not exists event_type text not null default 'booking';
alter table bookings add column if not exists buffer_before int not null default 0;
alter table bookings add column if not exists buffer_after int not null default 0;
alter table bookings add column if not exists staff_id text;
alter table bookings add column if not exists resource_id text;

alter table bookings drop constraint if exists bookings_source_chk;
alter table bookings add constraint bookings_source_chk
  check (source in ('online', 'manual'));

alter table bookings drop constraint if exists bookings_event_type_chk;
alter table bookings add constraint bookings_event_type_chk
  check (event_type in ('booking', 'block', 'break', 'personal', 'holiday', 'manual'));

update bookings set event_type = 'block' where kind = 'block' and event_type = 'booking';
update bookings set event_type = 'manual' where source = 'manual' and event_type = 'booking';

alter table bookings drop constraint if exists bookings_kind_customer_chk;
alter table bookings add constraint bookings_kind_customer_chk
  check (
    (kind = 'booking' and (customer_id is not null or source = 'manual'))
    or (kind = 'block' and customer_id is null)
  );

alter table bookings drop constraint if exists bookings_status_chk;
alter table bookings add constraint bookings_status_chk
  check (status in ('requested', 'confirmed', 'cancelled', 'done', 'no_show'));

alter table businesses add column if not exists timezone text not null default 'Asia/Tehran';
alter table businesses add column if not exists reminder_hours jsonb not null default '[24, 2]'::jsonb;
alter table businesses add column if not exists cancel_hours int not null default 24;

create table if not exists business_special_hours (
  id text primary key,
  business_id text not null references businesses (id) on delete cascade,
  day date not null,
  closed boolean not null default false,
  shifts jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  unique (business_id, day)
);

create index if not exists special_hours_biz_day_idx on business_special_hours (business_id, day);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  title text not null,
  body text not null,
  kind text not null,
  booking_id text,
  business_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on notifications (user_id) where read_at is null;

create table if not exists waitlist (
  id text primary key,
  business_id text not null references businesses (id) on delete cascade,
  user_id text not null,
  service_title text,
  day date not null,
  time_from text,
  time_to text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists waitlist_biz_day_idx on waitlist (business_id, day, status);

create table if not exists booking_events (
  id text primary key,
  booking_id text not null references bookings (id) on delete cascade,
  actor_id text,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists booking_events_booking_idx on booking_events (booking_id, created_at);

create table if not exists booking_holds (
  id text primary key,
  business_id text not null references businesses (id) on delete cascade,
  user_id text,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists booking_holds_live_idx
  on booking_holds (business_id, slot_start, slot_end)


-- Architecture only. No public URLs. No upload in this slice.
create table if not exists appointment_attachments (
  id text primary key,
  booking_id text not null references bookings (id) on delete cascade,
  owner_user_id text not null,
  kind text not null default 'image',
  content_type text not null,
  byte_size int not null,
  storage_key text not null,
  created_at timestamptz not null default now(),
  check (kind in ('image', 'document')),
  check (byte_size > 0 and byte_size <= 10485760)
);

create index if not exists appointment_attachments_booking_idx on appointment_attachments (booking_id);

-- Provider-independent deposit ledger. Never mark paid without a verified result.
create table if not exists payments (
  id text primary key,
  booking_id text not null references bookings (id) on delete cascade,
  amount int not null,
  currency text not null default 'IRR',
  status text not null default 'pending',
  provider text,
  provider_reference text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  check (status in ('pending', 'paid', 'failed', 'refunded')),
  check (amount >= 0)
);

create index if not exists payments_booking_idx on payments (booking_id);

-- Occupancy range includes service buffers so the DB remains the lock.
create or replace function booking_occ_range(slot_start timestamptz, slot_end timestamptz, buffer_before int, buffer_after int)
returns tstzrange language sql immutable as $$
  select tstzrange(
    slot_start - make_interval(mins => greatest(0, coalesce(buffer_before, 0))),
    slot_end + make_interval(mins => greatest(0, coalesce(buffer_after, 0))),
    '[)'
  );
$$;

create or replace function bookings_prevent_overlap() returns trigger as $$
begin
  if new.status is null or new.status not in ('requested', 'confirmed') then
    return new;
  end if;
  if new.kind is null or new.kind not in ('booking', 'block') then
    return new;
  end if;
  if new.slot_end is null then
    return new;
  end if;
  if exists (
    select 1 from bookings k
     where k.business_id = new.business_id
       and k.id is distinct from new.id
       and k.status in ('requested', 'confirmed')
       and k.kind in ('booking', 'block')
       and k.slot_end is not null
       and booking_occ_range(k.slot_start, k.slot_end, k.buffer_before, k.buffer_after)
           && booking_occ_range(new.slot_start, new.slot_end, new.buffer_before, new.buffer_after)
  ) then
    raise exception 'booking overlap' using errcode = '23P01';
  end if;
  if exists (
    select 1 from booking_holds h
     where h.business_id = new.business_id
       and h.expires_at > now()
       and tstzrange(h.slot_start, h.slot_end, '[)')
           && booking_occ_range(new.slot_start, new.slot_end, new.buffer_before, new.buffer_after)
  ) then
    raise exception 'booking overlap' using errcode = '23P01';
  end if;
  return new;
end
$$ language plpgsql;

drop trigger if exists bookings_prevent_overlap_trg on bookings;
create trigger bookings_prevent_overlap_trg
  before insert or update on bookings
  for each row execute procedure bookings_prevent_overlap();

do $$
begin
  if exists (select 1 from pg_extension where extname = 'btree_gist') then
    alter table bookings drop constraint if exists bookings_no_overlap;
    alter table bookings add constraint bookings_no_overlap
      exclude using gist (
        business_id with =,
        booking_occ_range(slot_start, slot_end, buffer_before, buffer_after) with &&
      )
      where (status in ('requested', 'confirmed') and kind in ('booking', 'block') and slot_end is not null);
  else
    raise notice 'skipping bookings_no_overlap gist (btree_gist missing); trigger remains';
  end if;
end $$;
