#!/bin/sh
# One-time: enable systemd timer so GitHub main deploys without SSH paste.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
install -m 644 "$APP_DIR/deploy/kasbokar-watch.service" /etc/systemd/system/kasbokar-watch.service
install -m 644 "$APP_DIR/deploy/kasbokar-watch.timer" /etc/systemd/system/kasbokar-watch.timer
if [ -f "$APP_DIR/deploy/kasbokar-tls-monitor.timer" ]; then
  install -m 644 "$APP_DIR/deploy/kasbokar-tls-monitor.service" /etc/systemd/system/kasbokar-tls-monitor.service
  install -m 644 "$APP_DIR/deploy/kasbokar-tls-monitor.timer" /etc/systemd/system/kasbokar-tls-monitor.timer
fi
systemctl daemon-reload
systemctl enable --now kasbokar-watch.timer
systemctl enable --now kasbokar-tls-monitor.timer 2>/dev/null || true
systemctl is-enabled docker >/dev/null 2>&1 || systemctl enable docker >/dev/null 2>&1 || true
echo "AUTO_DEPLOY_ON timer=kasbokar-watch.timer"
systemctl list-timers kasbokar-watch.timer kasbokar-tls-monitor.timer --no-pager | head -8
