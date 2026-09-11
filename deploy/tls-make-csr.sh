#!/bin/bash
# Generate a NEW TLS private key + CSR on this VPS only.
# Does not replace Production certs, does not reload Caddy, does not print the key.
set -euo pipefail
umask 077

APP_DIR=${APP_DIR:-/opt/kasbokarapp}
NEXT_DIR=/root/kasbokar-tls-next
KEY_PATH=$NEXT_DIR/privkey.pem
CSR_PATH=$NEXT_DIR/kasbokarapp.csr
LIVE_KEY=$APP_DIR/certs/privkey.pem
LIVE_CRT=$APP_DIR/certs/fullchain.pem

if ! command -v openssl >/dev/null 2>&1; then
  echo "OPENSSL_MISSING"
  exit 1
fi

# Do not touch or overwrite the live Production key.
if [ -e "$KEY_PATH" ]; then
  echo "EXISTS_STOP $KEY_PATH"
  echo "Refusing to overwrite. Remove only after you confirm it is not Production."
  exit 1
fi

mkdir -p "$NEXT_DIR"
chmod 700 "$NEXT_DIR"

# Official caddy:2-alpine in this compose has no user: override (runs as root
# in the container) and bind-mounts $APP_DIR/certs:/certs:ro. Host files are
# therefore root:root mode 600, same as the current live key. Do not chown to
# a host user that Caddy does not use.
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$KEY_PATH" >/dev/null
chmod 600 "$KEY_PATH"
chown root:root "$KEY_PATH"

openssl req -new -key "$KEY_PATH" -out "$CSR_PATH" \
  -subj "/CN=kasbokarapp.com" \
  -addext "subjectAltName=DNS:kasbokarapp.com,DNS:www.kasbokarapp.com"
chmod 644 "$CSR_PATH"
chown root:root "$CSR_PATH"

if grep -q "PRIVATE KEY" "$CSR_PATH"; then
  echo "CSR_CONTAINS_KEY_STOP"
  exit 1
fi

echo "LIVE_UNCHANGED $LIVE_KEY $LIVE_CRT"
echo "KEY_PATH $KEY_PATH"
echo "KEY_PERM $(stat -c '%a %U:%G' "$KEY_PATH")"
echo "KEY_BYTES $(stat -c '%s' "$KEY_PATH")"
echo "CSR_PATH $CSR_PATH"
echo "CSR_PERM $(stat -c '%a %U:%G' "$CSR_PATH")"
openssl req -in "$CSR_PATH" -noout -subject -verify
openssl req -in "$CSR_PATH" -noout -text | awk '/Subject Alternative Name/,/Signature Algorithm/' | sed '/Signature Algorithm/d'
echo "CSR_SHA256 $(openssl req -in "$CSR_PATH" -outform DER | sha256sum | awk '{print $1}')"
echo "CSR_BEGIN"
cat "$CSR_PATH"
echo "CSR_END"
echo "CSR_OK"
