#!/bin/sh
# Phase 0: delete leftover automated E2E rows only. Never drop real businesses.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
cd "$APP_DIR"
docker compose --profile with-db exec -T db psql -U kasbokar -d kasbokar <<'SQL'
begin;
delete from reviews
 where business_id in (select id from businesses where name = 'E2E TEST - DELETE ME');
delete from bookings
 where business_id in (select id from businesses where name = 'E2E TEST - DELETE ME');
delete from favorites
 where business_id in (select id from businesses where name = 'E2E TEST - DELETE ME');
delete from businesses where name = 'E2E TEST - DELETE ME';
commit;
SQL
echo "PHASE0_CLEANUP_OK"
