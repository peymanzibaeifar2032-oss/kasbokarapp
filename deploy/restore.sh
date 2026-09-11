#!/bin/sh
# Restore a pg_dump -Fc file from the kasbokar_backups volume.
# Usage (on the VPS): deploy/restore.sh kasbokar-YYYYMMDDThhmmssZ.dump
set -eu
FILE=${1:-}
if [ -z "$FILE" ]; then
  echo "usage: $0 kasbokar-YYYYMMDDThhmmssZ.dump" >&2
  echo "files:" >&2
  docker compose --profile with-db exec -T db ls -1 /backups >&2 || true
  exit 2
fi
cd /opt/kasbokarapp
docker compose --profile with-db exec -T db pg_restore --clean --if-exists -U kasbokar -d kasbokar "/backups/$FILE"
echo "[restore] done"
