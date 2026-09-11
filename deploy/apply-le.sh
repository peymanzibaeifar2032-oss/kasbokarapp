#!/bin/sh
# Decrypt the one-time TLS bundle and enable HTTPS. Passphrase is the only argument.
# Does not print the key. Delete deploy/le-bundle.enc after TLS_OK.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
cd "$APP_DIR"
if [ -z "${1:-}" ]; then
  echo "usage: sh deploy/apply-le.sh <passphrase>"
  exit 1
fi
mkdir -p certs
openssl enc -d -aes-256-cbc -pbkdf2 -in deploy/le-bundle.enc -pass "pass:$1" | tar xz -C certs
unset 1
chmod 600 certs/privkey.pem
chmod 644 certs/fullchain.pem
sh deploy/install-certs.sh
rm -f deploy/le-bundle.enc
echo "BUNDLE_REMOVED"
