#!/bin/sh
# Try HTTPS after DNS points here. If Let's Encrypt is blocked (common on
# Iranian VPS), stay on HTTP so the new app remains reachable.
# Idempotent. Does not print .env.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
IP=185.204.197.211
HOST=kasbokarapp.com
cd "$APP_DIR"

resolve() {
  getent ahostsv4 "$1" 2>/dev/null | awk '{print $1; exit}'
}

patch_env() {
  python3 - "$1" "$2" <<'PY'
import sys
from pathlib import Path
caddyfile, site_url = sys.argv[1], sys.argv[2]
p = Path("/opt/kasbokarapp/.env")
lines = p.read_text().splitlines() if p.exists() else []
kv, order = {}, []
for line in lines:
    if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    k = k.strip()
    if k not in kv:
        order.append(k)
    kv[k] = v
kv["SITE_URL"] = site_url
kv["BETTER_AUTH_URL"] = site_url
kv["CADDYFILE"] = caddyfile
kv["SITE_HOST"] = "kasbokarapp.com"
origins = [
    "http://185.204.197.211",
    "http://185.204.197.211:8080",
    "https://kasbokarapp.com",
    "http://kasbokarapp.com",
    "https://www.kasbokarapp.com",
    "http://www.kasbokarapp.com",
]
kv["TRUSTED_ORIGINS"] = ",".join(origins)
p.write_text("".join(f"{k}={kv[k]}\n" for k in order if k in kv) + "".join(
    f"{k}={kv[k]}\n" for k in kv if k not in order
))
p.chmod(0o600)
print("env", caddyfile, site_url)
PY
}

https_ok() {
  curl -sS -m 10 --resolve "$HOST:443:127.0.0.1" "https://$HOST/api/health" 2>/dev/null | grep -q '"ok":true'
}

http_ok() {
  curl -sS -m 8 -H "Host: $HOST" "http://127.0.0.1/api/health" 2>/dev/null | grep -q '"ok":true'
}

file_cert_valid() {
  crt=$APP_DIR/certs/fullchain.pem
  key=$APP_DIR/certs/privkey.pem
  [ -s "$crt" ] && [ -s "$key" ] || return 1
  openssl x509 -in "$crt" -noout -checkend 86400 >/dev/null 2>&1
}

cert_report() {
  crt=$APP_DIR/certs/fullchain.pem
  [ -s "$crt" ] || { echo "TLS_CERT_ABSENT"; return 0; }
  openssl x509 -in "$crt" -noout -serial -enddate -fingerprint -sha256 2>/dev/null || true
  end=$(openssl x509 -in "$crt" -noout -enddate 2>/dev/null | sed 's/notAfter=//')
  end_epoch=$(date -d "$end" +%s 2>/dev/null || echo 0)
  now=$(date -u +%s)
  if [ "$end_epoch" -gt 0 ]; then
    days=$(( (end_epoch - now) / 86400 ))
    echo "TLS_DAYS_LEFT $days"
    if [ "$days" -le 30 ]; then
      echo "TLS_RENEW_SOON file-based cert; Caddy auto_https is off"
    fi
  fi
}

APEX=$(resolve "$HOST" || true)
WWW=$(resolve "www.$HOST" || true)
if [ "$APEX" != "$IP" ] || [ "$WWW" != "$IP" ]; then
  echo "TLS_WAIT apex=${APEX:-none} www=${WWW:-none} want=$IP"
  exit 0
fi

if https_ok; then
  echo "TLS_OK https://$HOST"
  cert_report
  exit 0
fi

if file_cert_valid; then
  echo "TLS_NO_DOWNGRADE valid file certs present; not switching to HTTP"
  cert_report
  exit 0
fi

# Probe ACME APIs from this VPS. Timeout = blocked in Iran.
acme_reachable() {
  curl -sS -m 8 -o /dev/null -w "%{http_code}" "$1" 2>/dev/null || echo 000
}
LE_CODE=$(acme_reachable https://acme-v02.api.letsencrypt.org/directory)
if [ "$LE_CODE" != "200" ]; then
  if file_cert_valid; then
    echo "TLS_NO_DOWNGRADE letsencrypt HTTP $LE_CODE but file certs are valid"
    cert_report
    exit 0
  fi
  echo "TLS_BLOCKED letsencrypt HTTP $LE_CODE — staying on HTTP"
  mkdir -p deploy/acme-www
  patch_env Caddyfile "http://$IP"
  docker compose --profile with-db --profile tls up -d --remove-orphans
  if http_ok; then
    echo "HTTP_OK http://$HOST and http://$IP"
  fi
  echo "GPS needs HTTPS. Use the IP site until a certificate can be issued."
  exit 0
fi

mkdir -p deploy/acme-www
patch_env Caddyfile.tls "https://$HOST"
docker compose --profile with-db --profile tls up -d caddy
i=0
while [ "$i" -lt 30 ]; do
  i=$((i + 1))
  if https_ok; then
    echo "TLS_OK https://$HOST"
    exit 0
  fi
  sleep 4
done

echo "TLS_PENDING — no valid file cert; not forcing HTTP if HTTPS was expected"
if file_cert_valid; then
  echo "TLS_NO_DOWNGRADE"
  cert_report
  exit 0
fi
echo "TLS_NO_FILE_CERT — leaving current Caddyfile unchanged"
exit 0
