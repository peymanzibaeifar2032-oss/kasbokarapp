#!/bin/sh
# Production incident resync: preserve local VPS files, then FORCE rebuild
# origin/main. Does not git clean. Does not print secrets.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
cd "$APP_DIR"
chmod +x deploy/*.sh 2>/dev/null || true
FORCE_DEPLOY=1 sh deploy/release.sh
