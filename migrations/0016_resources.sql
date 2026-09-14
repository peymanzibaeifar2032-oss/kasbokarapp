-- Atomic Slice 1: staff/resource model.
-- Additive and non-destructive. Existing bookings stay.
-- Legacy businesses with zero resources keep business-wide occupancy.

create table if not exists business_resources (
  id text primary key,
  business_id text not null references businesses (id) on delete cascade,
  kind text not null default 'staff',
  name text not null,
  color text,
  active boolean not null default true,
  sort_order int not null default 0,
  user_id text,
  created_at timestamptz not null default now(),
  check (kind in ('staff', 'room', 'equipment', 'other')),
  check (char_length(btrim(name)) between 1 and 80)
);

create index if not exists business_resources_biz_idx
  on business_resources (business_id, active, sort_order, created_at);

create table if not exists resource_service_map (
  resource_id text not null references business_resources (id) on delete cascade,
  business_id text not null references businesses (id) on delete cascade,
  service_title text not null,
  primary key (resource_id, service_title)
);

create index if not exists resource_service_map_biz_idx
  on resource_service_map (business_id, service_title);

alter table booking_holds add column if not exists resource_id text;
alter table booking_holds add column if not exists staff_id text;

-- Point-in-time unique indexes lock the whole business to one slot_start.
-- Parallel staff requires them gone; the trigger + per-resource gist remain.
drop index if exists bookings_active_slot_uidx;
drop index if exists bookings_active_staff_slot_uidx;

-- Copy legacy staff_id into resource_id before FK audit.
update bookings
   set resource_id = staff_id
 where (resource_id is null or btrim(resource_id) = '')
   and staff_id is not null and btrim(staff_id) <> '';

update booking_holds
   set resource_id = staff_id
 where (resource_id is null or btrim(resource_id) = '')
   and staff_id is not null and btrim(staff_id) <> '';

-- Audit legacy staff_id/resource_id before any FK.
do $$
declare
  nonempty_res int;
  orphan_res int;
  nonempty_staff int;
  orphan_staff int;
begin
  select count(*) into nonempty_res
    from bookings where resource_id is not null and btrim(resource_id) <> '';
  select count(*) into orphan_res
    from bookings k
   where k.resource_id is not null and btrim(k.resource_id) <> ''
     and not exists (select 1 from business_resources r where r.id = k.resource_id);
  select count(*) into nonempty_staff
    from bookings where staff_id is not null and btrim(staff_id) <> '';
  select count(*) into orphan_staff
    from bookings k
   where k.staff_id is not null and btrim(k.staff_id) <> ''
     and not exists (select 1 from business_resources r where r.id = k.staff_id);

  raise notice '0016 audit bookings resource_id nonempty=% orphan=%; staff_id nonempty=% orphan=%',
    nonempty_res, orphan_res, nonempty_staff, orphan_staff;

  if orphan_res = 0 then
    begin
      alter table bookings drop constraint if exists bookings_resource_fk;
      alter table bookings add constraint bookings_resource_fk
        foreign key (resource_id) references business_resources (id) on delete set null;
    exception when others then
      raise notice '0016 skip bookings_resource_fk: %', sqlerrm;
    end;
    begin
      alter table booking_holds drop constraint if exists booking_holds_resource_fk;
      alter table booking_holds add constraint booking_holds_resource_fk
        foreign key (resource_id) references business_resources (id) on delete set null;
    exception when others then
      raise notice '0016 skip booking_holds_resource_fk: %', sqlerrm;
    end;
  else
    raise notice '0016 skip resource FK because orphan resource_id rows exist';
  end if;
end $$;

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

  -- Serialize writers for this business. Source of truth for race protection
  -- together with the per-resource gist (when present).
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
       and (
         not has_resources
         or new.resource_id is null
         or k.resource_id is null
         or k.resource_id = new.resource_id
       )
  ) then
    raise exception 'booking overlap' using errcode = '23P01';
  end if;

  if exists (
    select 1 from booking_holds h
     where h.business_id = new.business_id
       and h.expires_at > now()
       and tstzrange(h.slot_start, h.slot_end, '[)')
           && booking_occ_range(new.slot_start, new.slot_end, new.buffer_before, new.buffer_after)
       and (
         not has_resources
         or new.resource_id is null
         or h.resource_id is null
         or h.resource_id = new.resource_id
       )
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
    raise notice '0016 skipping per-resource gist; trigger remains';
  end if;
end $$;
