#!/bin/bash
# Activate CSR-split certs from /root/kasbokar-tls-next onto live Caddy.
# Never prints the private key. Rolls back live files if validate/health fail.
set -euo pipefail
umask 077

APP_DIR=${APP_DIR:-/opt/kasbokarapp}
NEXT=/root/kasbokar-tls-next
LIVE=$APP_DIR/certs
EXPECT_FP='64:88:A7:E9:93:CB:2E:8E:6B:FC:0A:24:6D:72:DE:4B:E1:3A:5C:E9:71:44:FB:BF:3D:F6:2C:69:2B:06:61:8B'
COMPOSE=(docker compose --profile with-db --profile tls)

cd "$APP_DIR"

if [ ! -s "$NEXT/fullchain.pem" ] || [ ! -s "$NEXT/privkey.pem" ]; then
  echo "NEXT_MISSING $NEXT"
  exit 1
fi
if [ ! -s "$LIVE/fullchain.pem" ] || [ ! -s "$LIVE/privkey.pem" ]; then
  echo "LIVE_MISSING $LIVE"
  exit 1
fi

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BAK=/root/kasbokar-tls-backup-$STAMP
mkdir -p "$BAK"
chmod 700 "$BAK"
cp -a "$LIVE/fullchain.pem" "$BAK/fullchain.pem"
cp -a "$LIVE/privkey.pem" "$BAK/privkey.pem"
chmod 600 "$BAK/privkey.pem"
chmod 644 "$BAK/fullchain.pem"
echo "BACKUP_OK $BAK"

python3 - <<PY
from subprocess import check_output, run
import sys
chain = "$NEXT/fullchain.pem"
key = "$NEXT/privkey.pem"
c = check_output(["openssl", "x509", "-in", chain, "-noout", "-pubkey"])
k = check_output(["openssl", "pkey", "-in", key, "-pubout"])
if c != k:
    print("STOP_NO_MATCH")
    sys.exit(1)
print("MATCH")
out = check_output(["openssl", "x509", "-in", chain, "-noout", "-ext", "subjectAltName"], text=True)
if "DNS:kasbokarapp.com" not in out or "DNS:www.kasbokarapp.com" not in out:
    print("STOP_SAN")
    print(out)
    sys.exit(1)
print("SAN_OK")
fp = check_output(["openssl", "x509", "-in", chain, "-noout", "-fingerprint", "-sha256"], text=True).strip()
print(fp)
if "$EXPECT_FP" not in fp:
    print("STOP_FINGERPRINT")
    sys.exit(1)
print("FINGERPRINT_OK")
PY

install -m 644 "$NEXT/fullchain.pem" "$LIVE/fullchain.pem.new"
install -m 600 "$NEXT/privkey.pem" "$LIVE/privkey.pem.new"
chown root:root "$LIVE/fullchain.pem.new" "$LIVE/privkey.pem.new"
mv -f "$LIVE/fullchain.pem.new" "$LIVE/fullchain.pem"
mv -f "$LIVE/privkey.pem.new" "$LIVE/privkey.pem"
chmod 644 "$LIVE/fullchain.pem"
chmod 600 "$LIVE/privkey.pem"
echo "INSTALL_OK"

restore() {
  echo "RESTORE $BAK"
  cp -a "$BAK/fullchain.pem" "$LIVE/fullchain.pem"
  cp -a "$BAK/privkey.pem" "$LIVE/privkey.pem"
  chmod 644 "$LIVE/fullchain.pem"
  chmod 600 "$LIVE/privkey.pem"
  "${COMPOSE[@]}" exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 || \
    "${COMPOSE[@]}" up -d caddy >/dev/null 2>&1 || true
}

if ! "${COMPOSE[@]}" exec -T caddy caddy validate --config /etc/caddy/Caddyfile; then
  echo "VALIDATE_FAIL"
  restore
  echo "ROLLED_BACK"
  exit 1
fi
echo "VALIDATE_OK"

if ! "${COMPOSE[@]}" exec -T caddy caddy reload --config /etc/caddy/Caddyfile; then
  echo "RELOAD_RETRY compose up"
  "${COMPOSE[@]}" up -d caddy
fi
echo "RELOAD_OK"

ok=0
i=0
while [ "$i" -lt 20 ]; do
  i=$((i + 1))
  h1=$(curl -sS -m 8 --resolve kasbokarapp.com:443:127.0.0.1 https://kasbokarapp.com/api/health 2>/dev/null || true)
  h2=$(curl -sS -m 8 --resolve www.kasbokarapp.com:443:127.0.0.1 https://www.kasbokarapp.com/api/health 2>/dev/null || true)
  echo "$h1" | grep -q '"ok":true' && echo "$h2" | grep -q '"ok":true' && ok=1 && break
  sleep 2
done
if [ "$ok" != 1 ]; then
  echo "HEALTH_FAIL"
  restore
  echo "ROLLED_BACK"
  exit 1
fi
echo "HEALTH_OK kasbokarapp.com"
echo "HEALTH_OK www.kasbokarapp.com"

active=$(echo | openssl s_client -connect 127.0.0.1:443 -servername kasbokarapp.com 2>/dev/null | openssl x509 -noout -fingerprint -sha256 -serial -ext subjectAltName)
echo "$active"
echo "$active" | grep -q "$EXPECT_FP" || {
  echo "ACTIVE_FINGERPRINT_FAIL"
  restore
  echo "ROLLED_BACK"
  exit 1
}
echo "ACTIVE_FINGERPRINT $EXPECT_FP"
echo "TLS_ROTATE_OK $STAMP"
echo "BACKUP_DIR $BAK"
echo "REVOKE_NOT_DONE"
