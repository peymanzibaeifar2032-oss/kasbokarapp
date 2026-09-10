#!/bin/sh
# Run on the VPS from cron, e.g. 15 2 * * * /opt/kasbokarapp/scripts/vps-backup.sh
# Uses DATABASE_URL from .env. Output is JSON (password hashes, not plaintext).
set -eu
cd "$(dirname "$0")/.."
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi
OUT="backups/$(date -u +%Y-%m-%d)"
mkdir -p "$OUT"
if command -v docker >/dev/null 2>&1 && docker compose ps web >/dev/null 2>&1; then
  docker compose exec -T web node scripts/backup.mjs "/tmp/backup-out"
  docker compose cp web:/tmp/backup-out "$OUT"
else
  node scripts/backup.mjs "$OUT"
fi
echo "backup written under $OUT"
