#!/bin/sh
# Rotate TLS from an encrypted bundle. Backup lives in /root, never in git.
# Usage: TLS_ROTATE_PASS='...' sh deploy/tls-rotate-vps.sh /root/le-rotate.enc
# Does not print the private key. Does not change DNS.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
cd "$APP_DIR"
ENC=${1:-/root/le-rotate.enc}
if [ ! -s "$ENC" ]; then
  echo "ENC_MISSING $ENC"
  exit 1
fi
if [ -z "${TLS_ROTATE_PASS:-}" ]; then
  echo "usage: TLS_ROTATE_PASS=... sh deploy/tls-rotate-vps.sh /root/le-rotate.enc"
  exit 1
fi
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BAK=/root/kasbokar-tls-backup-$STAMP
mkdir -p "$BAK" certs
if [ -s certs/fullchain.pem ] && [ -s certs/privkey.pem ]; then
  cp -a certs/fullchain.pem "$BAK/fullchain.pem"
  cp -a certs/privkey.pem "$BAK/privkey.pem"
  chmod 700 "$BAK"
  chmod 600 "$BAK/privkey.pem"
  echo "BACKUP_OK $BAK"
else
  echo "BACKUP_SKIP no previous certs"
fi
TMP=$(mktemp -d)
chmod 700 "$TMP"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT
printf '%s' "$TLS_ROTATE_PASS" | openssl enc -d -aes-256-cbc -pbkdf2 -pass stdin -in "$ENC" | tar xz -C "$TMP"
unset TLS_ROTATE_PASS
if [ ! -s "$TMP/fullchain.pem" ] || [ ! -s "$TMP/privkey.pem" ]; then
  echo "DECRYPT_FAIL"
  exit 1
fi
echo "NEW_CERT"
openssl x509 -in "$TMP/fullchain.pem" -noout -issuer -subject -dates -serial -fingerprint -sha256 -ext subjectAltName
cp -a "$TMP/fullchain.pem" certs/fullchain.pem
cp -a "$TMP/privkey.pem" certs/privkey.pem
chmod 644 certs/fullchain.pem
chmod 600 certs/privkey.pem
COMPOSE="docker compose --profile with-db --profile tls"
if ! $COMPOSE exec -T caddy caddy validate --config /etc/caddy/Caddyfile; then
  echo "VALIDATE_FAIL restoring"
  if [ -s "$BAK/privkey.pem" ]; then
    cp -a "$BAK/fullchain.pem" certs/fullchain.pem
    cp -a "$BAK/privkey.pem" certs/privkey.pem
  fi
  exit 1
fi
$COMPOSE exec -T caddy caddy reload --config /etc/caddy/Caddyfile || $COMPOSE up -d caddy
i=0
while [ "$i" -lt 20 ]; do
  i=$((i + 1))
  if curl -sS -m 8 --resolve kasbokarapp.com:443:127.0.0.1 https://kasbokarapp.com/api/health 2>/dev/null | grep -q '"ok":true' \
    && curl -sS -m 8 --resolve www.kasbokarapp.com:443:127.0.0.1 https://www.kasbokarapp.com/api/health 2>/dev/null | grep -q '"ok":true'; then
    echo "TLS_ROTATE_OK $STAMP"
    echo "ROLLBACK_DIR $BAK"
    rm -f "$ENC"
    echo "ENC_REMOVED"
    exit 0
  fi
  sleep 2
done
echo "TLS_ROTATE_FAIL restoring $BAK"
if [ -s "$BAK/privkey.pem" ]; then
  cp -a "$BAK/fullchain.pem" certs/fullchain.pem
  cp -a "$BAK/privkey.pem" certs/privkey.pem
  $COMPOSE exec -T caddy caddy reload --config /etc/caddy/Caddyfile || $COMPOSE up -d caddy
fi
exit 1
