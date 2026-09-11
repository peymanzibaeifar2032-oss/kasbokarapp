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

APEX=$(resolve "$HOST" || true)
WWW=$(resolve "www.$HOST" || true)
if [ "$APEX" != "$IP" ] || [ "$WWW" != "$IP" ]; then
  echo "TLS_WAIT apex=${APEX:-none} www=${WWW:-none} want=$IP"
  exit 0
fi

if https_ok; then
  echo "TLS_OK https://$HOST"
  exit 0
fi

# Probe ACME APIs from this VPS. Timeout = blocked in Iran.
acme_reachable() {
  curl -sS -m 8 -o /dev/null -w "%{http_code}" "$1" 2>/dev/null || echo 000
}
LE_CODE=$(acme_reachable https://acme-v02.api.letsencrypt.org/directory)
if [ "$LE_CODE" != "200" ]; then
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

echo "TLS_PENDING — revert to HTTP so the domain keeps working"
patch_env Caddyfile "http://$IP"
docker compose --profile with-db --profile tls up -d --remove-orphans
docker compose --profile with-db --profile tls logs --tail 20 caddy 2>/dev/null | grep -E 'acme|certificate|error|tls' | tail -12 || true
if http_ok; then
  echo "HTTP_OK http://$HOST and http://$IP"
fi
exit 0
