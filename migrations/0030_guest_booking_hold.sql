-- Guest tattoo requests have no user account. A payment hold is still a booking,
-- so a null customer_id is valid when the phone is stored on the row.
alter table bookings drop constraint if exists bookings_kind_customer_chk;
alter table bookings add constraint bookings_kind_customer_chk
  check (
    (kind = 'booking' and (customer_id is not null or source = 'manual' or customer_phone is not null))
    or (kind = 'block' and customer_id is null)
  );
