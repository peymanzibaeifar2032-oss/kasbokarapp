#!/bin/sh
# Optional later cleanup of 0012 Kermanshah category samples (biz-ks-*).
# Do not run until search verification is done. Never deletes real listings.
set -eu
docker compose --profile with-db exec -T db psql -U kasbokar -d kasbokar <<'SQL'
delete from reviews where business_id like 'biz-ks-%';
delete from bookings where business_id like 'biz-ks-%';
delete from favorites where business_id like 'biz-ks-%';
delete from businesses where id like 'biz-ks-%';
SQL
echo "CATEGORY_SAMPLES_REMOVED"
