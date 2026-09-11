#!/bin/sh
# Manual/bootstrap entry. After install-auto-deploy, GitHub main is enough.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
cd "$APP_DIR"
export GIT_SSH_COMMAND='ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new'
git fetch origin main
git reset --hard origin/main
chmod +x deploy/*.sh
sh deploy/install-auto-deploy.sh
FORCE_DEPLOY=1 sh deploy/release.sh
