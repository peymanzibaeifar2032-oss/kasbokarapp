#!/bin/sh
# Production readiness checks. No secrets printed.
set -eu
cd /opt/kasbokarapp
ok() { echo "PASS  $1"; }
bad() { echo "FAIL  $1 — $2"; }

echo "=== vps-prod-check $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

H=$(curl -sS -m 8 http://127.0.0.1:8080/api/health || true)
echo "$H" | grep -q '"ok":true' && echo "$H" | grep -q '"standalone":true' && ok "health standalone postgres" || bad "health" "$H"

MC=$(curl -sS -m 8 http://127.0.0.1:8080/api/map-config || true)
echo "$MC" | grep -q '/api/tiles' && ok "map-config same-origin" || bad "map-config" "$MC"
echo "$MC" | grep -q openstreetmap.org && bad "map osm.org in browser config" "$MC" || ok "map-config not osm.org"

curl -sS -m 15 -o /tmp/t.bin -w "%{http_code} %{content_type} %{size_download}\n" http://127.0.0.1:8080/api/tiles/11/1323/824 > /tmp/t.meta || true
META=$(cat /tmp/t.meta)
if echo "$META" | grep -q '^200' && echo "$META" | grep -qi 'image' && ! grep -qi 'api key required' /tmp/t.bin 2>/dev/null; then
  ok "tile image $META"
else
  bad "tile" "$META"
fi

python3 - <<'PY'
from pathlib import Path
p=Path('.env')
text=p.read_text() if p.exists() else ''
keys=set()
for line in text.splitlines():
    if '=' in line and not line.strip().startswith('#'):
        keys.add(line.split('=',1)[0].strip())
need=('STANDALONE','BETTER_AUTH_SECRET','DATABASE_URL','SITE_URL')
missing=[k for k in need if k not in keys]
print('PASS  env required keys' if not missing else 'FAIL  env missing '+','.join(missing))
print('INFO  smtp', 'SMTP_HOST' in keys or 'RESEND_API_KEY' in keys)
print('INFO  caddyfile', 'CADDYFILE' in keys)
PY

echo "-- restart policy --"
docker inspect -f '{{.Name}} {{.HostConfig.RestartPolicy.Name}}' \
  kasbokarapp-web-1 kasbokarapp-db-1 kasbokarapp-caddy-1 kasbokarapp-backup-1 2>/dev/null || true
systemctl is-enabled docker 2>/dev/null | grep -q enabled && ok "docker enabled on boot" || {
  systemctl enable docker >/dev/null 2>&1 || true
  systemctl is-enabled docker 2>/dev/null | grep -q enabled && ok "docker enabled on boot" || bad "docker boot" "not enabled"
}

echo "-- persistence restart --"
BID=$(docker compose --profile with-db exec -T db psql -U kasbokar -d kasbokar -Atc "select id from businesses limit 1;" | tr -d '\r')
docker compose --profile with-db restart web db >/dev/null
i=0
while [ "$i" -lt 25 ]; do
  i=$((i+1))
  curl -sf -m 4 http://127.0.0.1:8080/api/health | grep -q '"ok":true' && break
  sleep 2
done
curl -sf -m 4 http://127.0.0.1:8080/api/health | grep -q '"ok":true' && ok "health after container restart" || bad "health after restart" "down"
if [ -n "$BID" ]; then
  docker compose --profile with-db exec -T db psql -U kasbokar -d kasbokar -Atc "select count(*) from businesses where id='$BID';" | grep -q 1 \
    && ok "business row persisted" || bad "persist business" "$BID"
fi
docker compose --profile with-db exec -T db psql -U kasbokar -d kasbokar -Atc "select count(*) from bookings;" >/dev/null \
  && ok "bookings table reachable" || bad "bookings" "query failed"

echo "-- backup restore into throwaway db --"
DUMP=$(docker compose --profile with-db exec -T db sh -c 'ls -1t /backups/kasbokar-*.dump 2>/dev/null | head -1' | tr -d '\r')
if [ -z "$DUMP" ]; then
  bad "backup dump" "none"
else
  ok "backup dump exists"
  docker compose --profile with-db exec -T db psql -U kasbokar -d postgres -c "drop database if exists kasbokar_restore_test;" >/dev/null
  docker compose --profile with-db exec -T db psql -U kasbokar -d postgres -c "create database kasbokar_restore_test;" >/dev/null
  if docker compose --profile with-db exec -T db pg_restore --no-owner -U kasbokar -d kasbokar_restore_test "$DUMP" >/tmp/restore.out 2>/tmp/restore.err; then
    N=$(docker compose --profile with-db exec -T db psql -U kasbokar -d kasbokar_restore_test -Atc "select count(*) from information_schema.tables where table_schema='public';" | tr -d '\r')
    echo "$N" | grep -qE '^[1-9]' && ok "restore test tables=$N" || bad "restore tables" "$N"
  else
    bad "restore" "$(head -c 160 /tmp/restore.err)"
  fi
  docker compose --profile with-db exec -T db psql -U kasbokar -d postgres -c "drop database if exists kasbokar_restore_test;" >/dev/null
fi

echo "-- logs 5xx (tail) --"
docker compose --profile with-db --profile tls logs --tail=80 web 2>/dev/null | grep -E ' 5[0-9][0-9] |level.:.error' | tail -5 || echo "INFO  no recent web 5xx in tail"
docker compose --profile with-db --profile tls logs --tail=40 caddy 2>/dev/null | grep -E ' 5[0-9][0-9] ' | tail -5 || echo "INFO  no recent caddy 5xx in tail"

echo "-- caddy http / tls files --"
test -f deploy/Caddyfile && grep -q 'auto_https off' deploy/Caddyfile && ok "caddy http ready (no cert yet)"
test -f deploy/Caddyfile.tls && grep -q 'SITE_HOST' deploy/Caddyfile.tls && ok "caddy tls file ready (not enabled)"

echo "-- grok/netlify runtime --"
echo "$H" | grep -q '"standalone":true' && ok "no grok/netlify required for health"

echo "=== prod-check done ==="
