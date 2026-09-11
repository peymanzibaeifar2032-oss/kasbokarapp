#!/bin/sh
# Pull GitHub main when it moves, then release.sh (backup/health/smoke/rollback).
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
cd "$APP_DIR"
export GIT_SSH_COMMAND='ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new'
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" = "$REMOTE" ]; then
  echo "WATCH_SKIP $LOCAL"
  exit 0
fi
echo "WATCH_PULL $LOCAL -> $REMOTE"
exec sh deploy/release.sh
