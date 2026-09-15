#!/bin/sh
# Phase 0: delete leftover automated E2E/smoke rows only. Never drop real businesses.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
cd "$APP_DIR"
docker compose --profile with-db exec -T db psql -U kasbokar -d kasbokar <<'SQL'
begin;
delete from reviews
 where business_id in (
   select id from businesses
    where name in ('E2E TEST - DELETE ME', 'تست اسموک')
 );
delete from bookings
 where business_id in (
   select id from businesses
    where name in ('E2E TEST - DELETE ME', 'تست اسموک')
 );
delete from booking_holds
 where business_id in (
   select id from businesses
    where name in ('E2E TEST - DELETE ME', 'تست اسموک')
 );
delete from favorites
 where business_id in (
   select id from businesses
    where name in ('E2E TEST - DELETE ME', 'تست اسموک')
 );
delete from businesses
 where name in ('E2E TEST - DELETE ME', 'تست اسموک');
commit;
SQL
echo "PHASE0_CLEANUP_OK"
