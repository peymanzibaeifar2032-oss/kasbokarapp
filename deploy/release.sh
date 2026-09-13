#!/bin/sh
# Safe production release from GitHub main. No secrets printed.
# DEPLOY_OK | DEPLOY_FAILED <reason>
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
COMPOSE="docker compose --profile with-db --profile tls"
export GIT_SSH_COMMAND='ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new'
cd "$APP_DIR"
chmod +x deploy/*.sh 2>/dev/null || true

LOCK=/var/lock/kasbokar-release.lock
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "DEPLOY_FAILED locked — another release is running"
  exit 1
fi

OLD_SHA=$(git rev-parse HEAD)
git fetch origin main
NEW_SHA=$(git rev-parse origin/main)

if [ "$OLD_SHA" = "$NEW_SHA" ] && [ "${FORCE_DEPLOY:-0}" != "1" ]; then
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
  else
    $COMPOSE up -d --build --remove-orphans >/dev/null 2>&1 || true
  fi
  exit 1
}

wait_health() {
  i=0
  while [ "$i" -lt 40 ]; do
    i=$((i + 1))
    H=$(curl -sS -m 5 http://127.0.0.1:8080/api/health 2>/dev/null || true)
    echo "$H" | grep -q '"ok":true' && echo "$H" | grep -q '"standalone":true' && return 0
    sleep 3
  done
  return 1
}

echo "=== release $OLD_SHA -> $NEW_SHA ==="

if docker image inspect kasbokarapp-web:latest >/dev/null 2>&1; then
  docker tag kasbokarapp-web:latest kasbokarapp-web:prev
fi

$COMPOSE exec -T db sh -c 'pg_dump -Fc -f /backups/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).dump' >/dev/null \
  || echo "INFO  pre-deploy backup skipped (db not ready)"

git reset --hard "$NEW_SHA"
chmod +x deploy/*.sh 2>/dev/null || true
export GIT_SHA="$NEW_SHA"
printf 'GIT_SHA=%s\n' "$NEW_SHA" > .deploy-sha

BUILD_FLAGS="--no-cache"
$COMPOSE build $BUILD_FLAGS web || fail "build"
$COMPOSE up -d --force-recreate --remove-orphans || fail "up"

wait_health || fail "health"
LIVE=$(curl -sS -m 5 http://127.0.0.1:8080/api/health 2>/dev/null || true)
echo "$LIVE" | grep -q "$NEW_SHA" || fail "health-sha-mismatch"
echo "$LIVE" | grep -q 'kasbokar-jalali-month-v1' || fail "health-calendar-marker"

DBCHK=$($COMPOSE exec -T db psql -U kasbokar -d kasbokar -Atc "select 1" 2>/dev/null | tr -d '\r' || true)
[ "$DBCHK" = "1" ] || fail "database"

SMOKE_BASE=http://127.0.0.1:8080 sh deploy/smoke.sh || fail "smoke"
sh deploy/phase0-cleanup.sh || echo "INFO  phase0 cleanup skipped"

docker image prune -f >/dev/null 2>&1 || true
echo "DEPLOY_OK $NEW_SHA"
