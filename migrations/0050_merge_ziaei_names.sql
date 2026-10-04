-- امیر محمد ضیائی وفا and آقای امیر محمد ضیائی وفا are one client.
-- Keep every appointment, including Aban. Put the real ledger on the Aban visit:
-- 27 + 5 + 22 million received, 6 million still owed, 60 million total.

do $$
declare
  canon text;
  row_count int;
begin
  create temp table ziaei on commit drop as
  select t.id as request_id,
         t.booking_id,
         coalesce(b.slot_start, t.proposed_slot_start) as slot_start
    from tattoo_requests t
    left join bookings b on b.id = t.booking_id
   where regexp_replace(
           regexp_replace(
             translate(
               btrim(regexp_replace(coalesce(t.customer_name, ''), '[[:space:]‌]+', ' ', 'g')),
               'يىكئ',
               'ییکی'
             ),
             '^(آقای|آقا|خانم|خانوم) ',
             ''
           ),
           ' ',
           '',
           'g'
         ) = 'امیرمحمدضیاییوفا';

  select count(*) into row_count from ziaei;
  if row_count = 0 then
    raise notice 'no امیر محمد ضیائی وفا rows; nothing to merge';
    return;
  end if;

  select request_id into canon
    from ziaei
   order by
     case
       when slot_start >= timestamptz '2026-10-23 00:00:00+03:30'
        and slot_start < timestamptz '2026-11-22 00:00:00+03:30' then 0
       else 1
     end,
     abs(extract(epoch from (slot_start - timestamptz '2026-11-07 10:30:00+03:30'))),
     slot_start desc nulls last
   limit 1;

  update tattoo_payments
     set request_id = canon
   where request_id in (select request_id from ziaei);

  delete from tattoo_payments
   where request_id = canon
     and (
       amount_toman not in (27000000, 5000000, 22000000)
       or coalesce(note, '') = 'واریز قبلی'
     );

  delete from tattoo_payments
   where id in (
     select id from (
       select id,
              row_number() over (partition by amount_toman order by created_at, id) as rn
         from tattoo_payments
        where request_id = canon
          and amount_toman in (27000000, 5000000, 22000000)
     ) extra
     where rn > 1
   );

  insert into tattoo_payments (id, request_id, amount_toman, note, created_at)
  select 'ziaei-27-' || canon, canon, 27000000, 'واریز', timestamptz '2026-10-01 12:00:00+03:30'
   where not exists (
     select 1 from tattoo_payments where request_id = canon and amount_toman = 27000000
   );
  insert into tattoo_payments (id, request_id, amount_toman, note, created_at)
  select 'ziaei-5-' || canon, canon, 5000000, 'واریز', timestamptz '2026-10-15 12:00:00+03:30'
   where not exists (
     select 1 from tattoo_payments where request_id = canon and amount_toman = 5000000
   );
  insert into tattoo_payments (id, request_id, amount_toman, note, created_at)
  select 'ziaei-22-' || canon, canon, 22000000, 'واریز', timestamptz '2026-11-04 12:00:00+03:30'
   where not exists (
     select 1 from tattoo_payments where request_id = canon and amount_toman = 22000000
   );

  update tattoo_requests
     set customer_name = 'امیر محمد ضیائی وفا',
         price_min_toman = 60000000,
         price_max_toman = 60000000,
         paid_toman = 54000000,
         deposit_toman = 54000000,
         settled = false,
         is_continuation = false,
         carry_closed = false,
         updated_at = now()
   where id = canon;

  update tattoo_requests
     set customer_name = 'امیر محمد ضیائی وفا',
         price_min_toman = 0,
         price_max_toman = 0,
         paid_toman = 0,
         deposit_toman = 0,
         settled = false,
         is_continuation = true,
         carry_closed = false,
         artist_message = 'جلسه دوم',
         updated_at = now()
   where id in (select request_id from ziaei)
     and id <> canon;

  update bookings
     set customer_name = 'امیر محمد ضیائی وفا',
         finance_status = 'deposit_paid'
   where id = (select booking_id from ziaei where request_id = canon);

  update bookings
     set customer_name = 'امیر محمد ضیائی وفا',
         finance_status = 'no_payment_required'
   where id in (
     select booking_id from ziaei
      where request_id <> canon and booking_id is not null
   );

  update studio_fill_ins
     set customer_name = 'امیر محمد ضیائی وفا'
   where regexp_replace(
           regexp_replace(
             translate(
               btrim(regexp_replace(coalesce(customer_name, ''), '[[:space:]‌]+', ' ', 'g')),
               'يىكئ',
               'ییکی'
             ),
             '^(آقای|آقا|خانم|خانوم) ',
             ''
           ),
           ' ',
           '',
           'g'
         ) = 'امیرمحمدضیاییوفا';
end $$;
