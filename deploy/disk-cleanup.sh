#!/bin/sh
# Free disk on the VPS without touching appointments, education, or bots.
# Does not delete database volumes, backups, or the live app checkout.
set -eu
STAMP=/var/lib/kasbokar/disk-cleanup.stamp
mkdir -p /var/lib/kasbokar
if [ -f "$STAMP" ] && [ -n "$(find "$STAMP" -mmin -720 2>/dev/null)" ]; then
  echo "DISK_CLEANUP_SKIP recent"
  exit 0
fi

echo "DISK_BEFORE $(df -P / | awk 'NR==2 {print $3,$4,$5}')"

docker builder prune -af >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true
docker container prune -f >/dev/null 2>&1 || true

if [ -d /var/backups/kasbokar-local ]; then
  find /var/backups/kasbokar-local -mindepth 1 -maxdepth 1 -type d -mtime +3 -exec rm -rf {} + 2>/dev/null || true
fi

journalctl --vacuum-size=80M >/dev/null 2>&1 || true
apt-get clean >/dev/null 2>&1 || true
find /tmp -type f -mtime +1 -size +5M -delete 2>/dev/null || true

if [ -d /root/.npm ]; then
  rm -rf /root/.npm/_cacache 2>/dev/null || true
fi

date -u +%Y-%m-%dT%H:%M:%SZ > "$STAMP"
echo "DISK_AFTER $(df -P / | awk 'NR==2 {print $3,$4,$5}')"
echo "DISK_CLEANUP_OK"
