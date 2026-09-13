#!/bin/sh
# Pull GitHub main when it moves, then release.sh (backup/health/smoke/rollback).
# After DNS points here, enable-tls.sh turns on Let's Encrypt without SSH.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
cd "$APP_DIR"
export GIT_SSH_COMMAND='ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new'
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
H=$(curl -sS -m 5 http://127.0.0.1:8080/api/health 2>/dev/null || true)
NEED_REBUILD=0
echo "$H" | grep -q 'jalali-month-v1' || NEED_REBUILD=1
if [ "$LOCAL" != "$REMOTE" ] || [ "$NEED_REBUILD" = "1" ]; then
  echo "WATCH_PULL $LOCAL -> $REMOTE rebuild=$NEED_REBUILD"
  FORCE_DEPLOY=$NEED_REBUILD sh deploy/release.sh
else
  echo "WATCH_SKIP $LOCAL"
fi
sh deploy/enable-tls.sh || true
sh deploy/tls-cleanup-once.sh || true
