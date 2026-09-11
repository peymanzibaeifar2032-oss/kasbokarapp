-- Phase 1: exclusive slot lock + future staff column. Backward compatible.
alter table bookings add column if not exists staff_id text;
alter table bookings add column if not exists resource_id text;

-- Collapse race duplicates: keep earliest active row, cancel later clones.
with ranked as (
  select id,
         row_number() over (
           partition by business_id, slot_start, coalesce(staff_id, '')
           order by created_at asc, id asc
         ) as rn
  from bookings
  where status in ('requested', 'confirmed')
)
update bookings b
   set status = 'cancelled'
  from ranked r
 where b.id = r.id
   and r.rn > 1;

create unique index if not exists bookings_active_slot_uidx
  on bookings (business_id, slot_start)
  where status in ('requested', 'confirmed') and staff_id is null;

create unique index if not exists bookings_active_staff_slot_uidx
  on bookings (business_id, staff_id, slot_start)
  where status in ('requested', 'confirmed') and staff_id is not null;

create index if not exists businesses_city_cat_idx on businesses (city, category_id);
create index if not exists businesses_lat_lng_idx on businesses (latitude, longitude);
