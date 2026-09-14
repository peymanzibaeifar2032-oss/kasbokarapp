-- Atomic Slice 1: staff/resource occupancy.
-- Additive and non-destructive. Existing bookings stay.
-- Legacy businesses with zero resources keep business-wide occupancy.
-- NULL resource_id = GLOBAL/WILDCARD occupancy, never "Any Staff".

create table if not exists business_resources (
  id text primary key,
  business_id text not null references businesses (id) on delete cascade,
  kind text not null default 'staff',
  name text not null,
  color text,
  active boolean not null default true,
  sort_order int not null default 0,
  user_id text,
  capacity int not null default 1,
  created_at timestamptz not null default now(),
  check (kind in ('staff', 'chair', 'room', 'equipment')),
  check (capacity = 1),
  check (char_length(btrim(name)) between 1 and 80)
);

create index if not exists business_resources_biz_idx
  on business_resources (business_id, active, sort_order, created_at);

create table if not exists resource_work_hours (
  id text primary key,
  resource_id text not null references business_resources (id) on delete cascade,
  business_id text not null references businesses (id) on delete cascade,
  day text not null,
  open text not null default '',
  close text not null default '',
  closed boolean not null default false,
  unique (resource_id, day)
);

create index if not exists resource_work_hours_biz_idx
  on resource_work_hours (business_id, resource_id);

create table if not exists resource_special_hours (
  id text primary key,
  resource_id text not null references business_resources (id) on delete cascade,
  business_id text not null references businesses (id) on delete cascade,
  day date not null,
  closed boolean not null default false,
  shifts jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  unique (resource_id, day)
);

create index if not exists resource_special_hours_res_day_idx
  on resource_special_hours (resource_id, day);

alter table booking_holds add column if not exists resource_id text;
alter table booking_holds add column if not exists staff_id text;

-- Point-in-time unique indexes lock the whole business to one slot_start.
drop index if exists bookings_active_slot_uidx;
drop index if exists bookings_active_staff_slot_uidx;

-- Map legacy staff_id → resource_id only when that resource exists on the same business.
update bookings k
   set resource_id = k.staff_id
 where (k.resource_id is null or btrim(k.resource_id) = '')
   and k.staff_id is not null and btrim(k.staff_id) <> ''
   and exists (
     select 1 from business_resources r
      where r.id = k.staff_id
        and r.business_id = k.business_id
   );

update booking_holds h
   set resource_id = h.staff_id
 where (h.resource_id is null or btrim(h.resource_id) = '')
   and h.staff_id is not null and btrim(h.staff_id) <> ''
   and exists (
     select 1 from business_resources r
      where r.id = h.staff_id
        and r.business_id = h.business_id
   );

do $$
declare
  orphan_bookings int;
  orphan_holds int;
  cross_bookings int;
  cross_holds int;
begin
  select count(*) into orphan_bookings
    from bookings k
   where k.resource_id is not null and btrim(k.resource_id) <> ''
     and not exists (select 1 from business_resources r where r.id = k.resource_id);

  select count(*) into orphan_holds
    from booking_holds h
   where h.resource_id is not null and btrim(h.resource_id) <> ''
     and not exists (select 1 from business_resources r where r.id = h.resource_id);

  select count(*) into cross_bookings
    from bookings k
    join business_resources r on r.id = k.resource_id
   where r.business_id is distinct from k.business_id;

  select count(*) into cross_holds
    from booking_holds h
    join business_resources r on r.id = h.resource_id
   where r.business_id is distinct from h.business_id;

  raise notice '0016 audit orphan_bookings=% orphan_holds=% cross_bookings=% cross_holds=%',
    orphan_bookings, orphan_holds, cross_bookings, cross_holds;

  if orphan_bookings > 0 or orphan_holds > 0 or cross_bookings > 0 or cross_holds > 0 then
    raise exception '0016 resource FK refused: orphan_bookings=% orphan_holds=% cross_bookings=% cross_holds=%',
      orphan_bookings, orphan_holds, cross_bookings, cross_holds;
  end if;

  alter table bookings drop constraint if exists bookings_resource_fk;
  alter table bookings add constraint bookings_resource_fk
    foreign key (resource_id) references business_resources (id) on delete set null;

  alter table booking_holds drop constraint if exists booking_holds_resource_fk;
  alter table booking_holds add constraint booking_holds_resource_fk
    foreign key (resource_id) references business_resources (id) on delete set null;
end $$;

create or replace function occupancy_resources_conflict(has_resources boolean, a text, b text)
returns boolean
language sql
immutable
as $$
  select case
    when not coalesce(has_resources, false) then true
    when a is null or btrim(a) = '' or b is null or btrim(b) = '' then true
    else a = b
  end;
$$;

create or replace function bookings_prevent_overlap() returns trigger as $$
declare
  has_resources boolean;
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

  perform 1 from businesses where id = new.business_id for update;

  select exists (
    select 1 from business_resources r
     where r.business_id = new.business_id and r.active = true
  ) into has_resources;

  if exists (
    select 1 from bookings k
     where k.business_id = new.business_id
       and k.id is distinct from new.id
       and k.status in ('requested', 'confirmed')
       and k.kind in ('booking', 'block')
       and k.slot_end is not null
       and booking_occ_range(k.slot_start, k.slot_end, k.buffer_before, k.buffer_after)
           && booking_occ_range(new.slot_start, new.slot_end, new.buffer_before, new.buffer_after)
       and occupancy_resources_conflict(has_resources, k.resource_id, new.resource_id)
  ) then
    raise exception 'booking overlap' using errcode = '23P01';
  end if;

  if exists (
    select 1 from booking_holds h
     where h.business_id = new.business_id
       and h.expires_at > now()
       and tstzrange(h.slot_start, h.slot_end, '[)')
           && booking_occ_range(new.slot_start, new.slot_end, new.buffer_before, new.buffer_after)
       and occupancy_resources_conflict(has_resources, h.resource_id, new.resource_id)
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

create or replace function booking_holds_prevent_overlap() returns trigger as $$
declare
  has_resources boolean;
begin
  if new.expires_at is not null and new.expires_at <= now() then
    return new;
  end if;
  if new.slot_end is null or new.slot_start is null then
    return new;
  end if;

  perform 1 from businesses where id = new.business_id for update;

  select exists (
    select 1 from business_resources r
     where r.business_id = new.business_id and r.active = true
  ) into has_resources;

  if exists (
    select 1 from bookings k
     where k.business_id = new.business_id
       and k.status in ('requested', 'confirmed')
       and k.kind in ('booking', 'block')
       and k.slot_end is not null
       and booking_occ_range(k.slot_start, k.slot_end, k.buffer_before, k.buffer_after)
           && tstzrange(new.slot_start, new.slot_end, '[)')
       and occupancy_resources_conflict(has_resources, k.resource_id, new.resource_id)
  ) then
    raise exception 'booking overlap' using errcode = '23P01';
  end if;

  if exists (
    select 1 from booking_holds h
     where h.business_id = new.business_id
       and h.id is distinct from new.id
       and h.expires_at > now()
       and tstzrange(h.slot_start, h.slot_end, '[)')
           && tstzrange(new.slot_start, new.slot_end, '[)')
       and occupancy_resources_conflict(has_resources, h.resource_id, new.resource_id)
  ) then
    raise exception 'booking overlap' using errcode = '23P01';
  end if;
  return new;
end
$$ language plpgsql;

drop trigger if exists booking_holds_prevent_overlap_trg on booking_holds;
create trigger booking_holds_prevent_overlap_trg
  before insert or update on booking_holds
  for each row execute procedure booking_holds_prevent_overlap();

do $$
begin
  if exists (select 1 from pg_extension where extname = 'btree_gist') then
    alter table bookings drop constraint if exists bookings_no_overlap;
    alter table bookings add constraint bookings_no_overlap
      exclude using gist (
        business_id with =,
        resource_id with =,
        booking_occ_range(slot_start, slot_end, buffer_before, buffer_after) with &&
      )
      where (
        status in ('requested', 'confirmed')
        and kind in ('booking', 'block')
        and slot_end is not null
        and resource_id is not null
      );
  else
    raise notice '0016 skipping per-resource gist; triggers remain the authority';
  end if;
end $$;
