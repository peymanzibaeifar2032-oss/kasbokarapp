-- محمد رضائی and محمد رضائی دندانپزشک are one client: 09120926686.
-- Keep the 10 Aban 1405 session (2026-11-01 Tehran). Drop the other session.
-- Keep a single 10,000,000 payment.

do $$
declare
  keep_count int;
  kept_request text;
begin
  create temp table rezaei_rows on commit drop as
  select t.id as request_id,
         t.booking_id,
         coalesce(b.slot_start, t.proposed_slot_start) as slot_start,
         (
           (coalesce(b.slot_start, t.proposed_slot_start) at time zone 'Asia/Tehran')::date = date '2026-11-01'
         ) as keep_aban
    from tattoo_requests t
    left join bookings b on b.id = t.booking_id
   where right(regexp_replace(coalesce(t.customer_phone, ''), '\D', '', 'g'), 10) = '9120926686'
      or right(regexp_replace(coalesce(t.customer_phone_2, ''), '\D', '', 'g'), 10) = '9120926686'
      or (
        btrim(regexp_replace(coalesce(t.customer_name, ''), '[[:space:]]+', ' ', 'g')) in (
          'محمد رضائی',
          'محمد رضائی دندانپزشک',
          'محمد رضایی',
          'محمد رضایی دندانپزشک',
          'محمد رضائي',
          'محمد رضائي دندانپزشک'
        )
        and (
          coalesce(t.customer_phone, '') in ('', '09000000000')
          or right(regexp_replace(coalesce(t.customer_phone, ''), '\D', '', 'g'), 10) = '9120926686'
        )
      );

  select count(*) into keep_count from rezaei_rows where keep_aban;
  if keep_count = 0 then
    raise notice 'no 10 Aban session for 09120926686; left every row in place';
    return;
  end if;

  select request_id into kept_request
    from rezaei_rows
   where keep_aban
   order by slot_start
   limit 1;

  update tattoo_payments
     set request_id = kept_request
   where request_id in (select request_id from rezaei_rows where not keep_aban);

  delete from tattoo_payments
   where id in (
     select id from (
       select p.id, row_number() over (order by p.created_at) as rn
         from tattoo_payments p
        where p.request_id = kept_request
          and p.amount_toman = 10000000
     ) extra
     where rn > 1
   );

  delete from bookings
   where id in (
     select booking_id from rezaei_rows
      where not keep_aban and booking_id is not null
   )
     and id not in (
       select booking_id from rezaei_rows
        where keep_aban and booking_id is not null
     );

  delete from tattoo_requests
   where id in (select request_id from rezaei_rows where not keep_aban);

  update tattoo_requests t
     set customer_phone = '09120926686',
         customer_name = 'محمد رضائی',
         paid_toman = coalesce((select sum(amount_toman) from tattoo_payments p where p.request_id = t.id), 0),
         settled = coalesce((select sum(amount_toman) from tattoo_payments p where p.request_id = t.id), 0)
                  >= coalesce(t.price_min_toman, 0)
              and coalesce(t.price_min_toman, 0) > 0
   where t.id in (select request_id from rezaei_rows where keep_aban);

  update bookings
     set customer_phone = '09120926686',
         customer_name = 'محمد رضائی'
   where id in (
     select booking_id from rezaei_rows
      where keep_aban and booking_id is not null
   );
end $$;
