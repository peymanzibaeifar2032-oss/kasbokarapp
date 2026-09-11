#!/bin/sh
set -eu
mkdir -p /backups
dump_once() {
  ts=$(date -u +%Y%m%dT%H%M%SZ)
  dest="/backups/kasbokar-${ts}.dump"
  pg_dump -Fc -f "$dest"
  echo "[backup] wrote $dest"
  ls -1t /backups/kasbokar-*.dump 2>/dev/null | tail -n +8 | xargs -r rm -f
}
dump_once
while true; do
  sleep 86400
  dump_once || echo "[backup] dump failed" >&2
done
