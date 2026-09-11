#!/bin/sh
# Pull GitHub main and rebuild. .env is gitignored and kept.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
cd "$APP_DIR"
export GIT_SSH_COMMAND='ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new'
git fetch origin main
git reset --hard origin/main
chmod +x deploy/*.sh 2>/dev/null || true
docker compose --profile with-db --profile tls up -d --build --remove-orphans
docker image prune -f >/dev/null
echo UPDATE_OK
