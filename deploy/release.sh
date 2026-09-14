#!/bin/sh
# Safe production release from GitHub main. No secrets printed.
# DEPLOY_OK | DEPLOY_FAILED <reason>
# PASS only when origin/main = checkout = image BUILD_SHA = /api/health SHA
# and required migrations/schema for this release are present.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
COMPOSE="docker compose --profile with-db --profile tls"
export COMPOSE
export GIT_SSH_COMMAND='ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new'
cd "$APP_DIR"
chmod +x deploy/*.sh 2>/dev/null || true

LOCK=/var/lock/kasbokar-release.lock
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "DEPLOY_FAILED locked — another release is running"
  exit 1
fi

preserve_local() {
  dest=/var/backups/kasbokar-local/$(date -u +%Y%m%dT%H%M%SZ)
  mkdir -p "$dest"
  git status -sb > "$dest/git-status.txt" 2>/dev/null || true
  git diff > "$dest/git-diff.patch" 2>/dev/null || true
  [ -f deploy/cleanup-category-samples.sh ] && cp -a deploy/cleanup-category-samples.sh "$dest/" || true
  [ -f PROD_REPORT.txt ] && cp -a PROD_REPORT.txt "$dest/" || true
  echo "PRESERVED $dest"
}

image_sha() {
  $COMPOSE run --no-deps --rm --entrypoint cat web /app/BUILD_SHA 2>/dev/null | tr -d '\r\n' || true
}

schema_ready() {
  names=$($COMPOSE exec -T db psql -U kasbokar -d kasbokar -Atc \
    "select string_agg(name, ',' order by name) from _migrations where name in ('0014_calendar.sql','0015_finance.sql','0016_resources.sql');" \
    2>/dev/null | tr -d '\r' || true)
  echo "$names" | grep -q "0014_calendar.sql" || return 1
  echo "$names" | grep -q "0015_finance.sql" || return 1
  echo "$names" | grep -q "0016_resources.sql" || return 1
  return 0
}

preflight_sql() {
  echo "=== preflight SQL (read-only) ==="
  $COMPOSE exec -T db psql -U kasbokar -d kasbokar -v ON_ERROR_STOP=1 <<'SQL'
BEGIN READ ONLY;
SET LOCAL default_transaction_read_only = on;
SELECT count(*) AS booking_null_customer
  FROM bookings WHERE kind = 'booking' AND customer_id IS NULL;
SELECT count(*) AS block_with_customer
  FROM bookings WHERE kind = 'block' AND customer_id IS NOT NULL;
SELECT count(*) AS active_null_slot_end
  FROM bookings
 WHERE status IN ('requested','confirmed')
   AND kind IN ('booking','block')
   AND slot_end IS NULL;
SELECT name FROM _migrations ORDER BY name;
ROLLBACK;
SQL
  null_cust=$($COMPOSE exec -T db psql -U kasbokar -d kasbokar -Atc \
    "select count(*) from bookings where kind='booking' and customer_id is null;" | tr -d '\r')
  null_end=$($COMPOSE exec -T db psql -U kasbokar -d kasbokar -Atc \
    "select count(*) from bookings where status in ('requested','confirmed') and kind in ('booking','block') and slot_end is null;" | tr -d '\r')
  [ "$null_end" = "0" ] || { echo "PREFLIGHT_FAIL active_null_slot_end=$null_end"; return 1; }
  echo "PREFLIGHT_OK booking_null_customer=$null_cust active_null_slot_end=$null_end"
}

OLD_SHA=$(git rev-parse HEAD)
preserve_local
git fetch origin main
NEW_SHA=$(git rev-parse origin/main)
CURRENT_IMAGE=$(image_sha)

if [ "$OLD_SHA" = "$NEW_SHA" ] && [ "${FORCE_DEPLOY:-0}" != "1" ] \
  && [ "$CURRENT_IMAGE" = "$NEW_SHA" ] && schema_ready; then
  echo "DEPLOY_OK already $OLD_SHA"
  exit 0
fi

fail() {
  reason=$1
  echo "DEPLOY_FAILED $reason"
  git reset --hard "$OLD_SHA" >/dev/null 2>&1 || true
  printf 'GIT_SHA=%s\n' "$OLD_SHA" > .deploy-sha
  export GIT_SHA="$OLD_SHA"
  if docker image inspect kasbokarapp-web:prev >/dev/null 2>&1; then
    docker tag kasbokarapp-web:prev kasbokarapp-web:latest >/dev/null
    $COMPOSE up -d --no-build --remove-orphans >/dev/null 2>&1 || true
  fi
  exit 1
}

wait_health() {
  i=0
  while [ "$i" -lt 50 ]; do
    i=$((i + 1))
    H=$(curl -sS -m 5 http://127.0.0.1:8080/api/health 2>/dev/null || true)
    echo "$H" | grep -q '"ok":true' && echo "$H" | grep -q '"standalone":true' && return 0
    sleep 3
  done
  return 1
}

echo "=== release $OLD_SHA -> $NEW_SHA image=$CURRENT_IMAGE force=${FORCE_DEPLOY:-0} ==="

DUMP_NAME=pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).dump
$COMPOSE exec -T db sh -c "pg_dump -Fc -f /backups/$DUMP_NAME" >/dev/null \
  || echo "INFO  pre-deploy backup skipped (db not ready)"
if $COMPOSE exec -T db sh -c "test -s /backups/$DUMP_NAME" >/dev/null 2>&1; then
  $COMPOSE exec -T db pg_restore -l "/backups/$DUMP_NAME" >/tmp/kasb-dump.list 2>/tmp/kasb-dump.err \
    && grep -Eqi 'TABLE' /tmp/kasb-dump.list && echo "BACKUP_OK $DUMP_NAME" \
    || echo "INFO  backup list skipped"
else
  echo "INFO  backup file not confirmed"
fi

preflight_sql || fail "preflight"

if docker image inspect kasbokarapp-web:latest >/dev/null 2>&1; then
  docker tag kasbokarapp-web:latest kasbokarapp-web:prev
fi

git reset --hard "$NEW_SHA"
# Untracked local reports stay (no git clean).
chmod +x deploy/*.sh 2>/dev/null || true
export GIT_SHA="$NEW_SHA"
printf 'GIT_SHA=%s\n' "$NEW_SHA" > .deploy-sha

BUILD_FLAGS="--no-cache"
$COMPOSE build $BUILD_FLAGS --build-arg "GIT_SHA=$NEW_SHA" web || fail "build"

BUILT=$(image_sha)
echo "BUILT_SHA $BUILT"
[ "$BUILT" = "$NEW_SHA" ] || fail "image-sha-mismatch"

MIG=$($COMPOSE run --no-deps --rm --entrypoint ls web /app/migrations | tr -d '\r')
echo "$MIG" | grep -qx "0014_calendar.sql" || fail "image-missing-0014"
echo "$MIG" | grep -qx "0015_finance.sql" || fail "image-missing-0015"
echo "$MIG" | grep -qx "0016_resources.sql" || fail "image-missing-0016"

$COMPOSE up -d --force-recreate --remove-orphans || fail "up"

wait_health || fail "health"
LIVE=$(curl -sS -m 5 http://127.0.0.1:8080/api/health 2>/dev/null || true)
echo "$LIVE" | grep -q "$NEW_SHA" || fail "health-sha-mismatch"
echo "$LIVE" | grep -q '"shaSource":"image"' || fail "health-sha-source"
echo "$LIVE" | grep -q 'kasbokar-jalali-month-v1' || fail "health-calendar-marker"
echo "$LIVE" | grep -q '"m0014":true' || fail "health-m0014"
echo "$LIVE" | grep -q '"m0015":true' || fail "health-m0015"
echo "$LIVE" | grep -q '"m0016":true' || fail "health-m0016"
echo "$LIVE" | grep -q 'postgres+0015' || fail "health-0015-marker"

schema_ready || fail "database-schema"

HEAD_NOW=$(git rev-parse HEAD)
ORIGIN_NOW=$(git rev-parse origin/main)
[ "$HEAD_NOW" = "$NEW_SHA" ] || fail "checkout-mismatch"
[ "$ORIGIN_NOW" = "$NEW_SHA" ] || fail "origin-mismatch"

SMOKE_BASE=http://127.0.0.1:8080 sh deploy/smoke.sh || fail "smoke"
sh deploy/verify-release.sh "$NEW_SHA" || fail "verify-release"
sh deploy/phase0-cleanup.sh || echo "INFO  phase0 cleanup skipped"

docker image prune -f >/dev/null 2>&1 || true
echo "DEPLOY_OK $NEW_SHA"
