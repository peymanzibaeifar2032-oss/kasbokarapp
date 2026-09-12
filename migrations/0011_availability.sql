-- Phase 3.2 true availability.
-- Occupancy = work hours + duration + bookings + blocks.
-- No attachments. No walk-in. kind is booking | block only.

alter table bookings add column if not exists slot_end timestamptz;
alter table bookings add column if not exists kind text not null default 'booking';

update bookings k
   set slot_end = k.slot_start + make_interval(mins => greatest(10, coalesce(b.slot_minutes, 60)))
  from businesses b
 where k.business_id = b.id
   and k.slot_end is null;

alter table bookings drop constraint if exists bookings_kind_chk;
alter table bookings add constraint bookings_kind_chk
  check (kind in ('booking', 'block'));

alter table bookings alter column customer_id drop not null;

alter table bookings drop constraint if exists bookings_kind_customer_chk;
alter table bookings add constraint bookings_kind_customer_chk
  check (
    (kind = 'booking' and customer_id is not null)
    or (kind = 'block' and customer_id is null)
  );

create index if not exists bookings_occupancy_idx
  on bookings (business_id, slot_start, slot_end)
  where status in ('requested', 'confirmed')
    and kind in ('booking', 'block');

-- Fail the migration instead of forcing overlapping production rows.
do $$
declare
  n int;
begin
  select count(*) into n
  from bookings a
  join bookings b
    on a.business_id = b.business_id
   and a.id < b.id
  where a.status in ('requested', 'confirmed')
    and b.status in ('requested', 'confirmed')
    and a.kind in ('booking', 'block')
    and b.kind in ('booking', 'block')
    and a.slot_end is not null
    and b.slot_end is not null
    and tstzrange(a.slot_start, a.slot_end, '[)') && tstzrange(b.slot_start, b.slot_end, '[)');
  if n > 0 then
    raise exception '0011_availability overlap conflict: % active pair(s). Do not force or delete production data.', n;
  end if;
end $$;

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
       and tstzrange(k.slot_start, k.slot_end, '[)') && tstzrange(new.slot_start, new.slot_end, '[)')
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
  create extension if not exists btree_gist;
exception
  when others then
    raise notice 'btree_gist unavailable: %', sqlerrm;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'btree_gist') then
    alter table bookings drop constraint if exists bookings_no_overlap;
    alter table bookings add constraint bookings_no_overlap
      exclude using gist (
        business_id with =,
        tstzrange(slot_start, slot_end, '[)') with &&
      )
      where (status in ('requested', 'confirmed') and kind in ('booking', 'block') and slot_end is not null);
  else
    raise notice 'skipping bookings_no_overlap (btree_gist missing)';
  end if;
end $$;
