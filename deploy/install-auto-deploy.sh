#!/bin/sh
# One-time: enable systemd timer so GitHub main deploys without SSH paste.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
install -m 644 "$APP_DIR/deploy/kasbokar-watch.service" /etc/systemd/system/kasbokar-watch.service
install -m 644 "$APP_DIR/deploy/kasbokar-watch.timer" /etc/systemd/system/kasbokar-watch.timer
systemctl daemon-reload
systemctl enable --now kasbokar-watch.timer
systemctl is-enabled docker >/dev/null 2>&1 || systemctl enable docker >/dev/null 2>&1 || true
echo "AUTO_DEPLOY_ON timer=kasbokar-watch.timer"
systemctl list-timers kasbokar-watch.timer --no-pager | head -5
