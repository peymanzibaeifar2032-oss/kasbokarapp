#!/bin/sh
# When DNS already points here, switch Caddy to TLS and SITE_URL to https.
# Idempotent. Does not print .env. DNS is never changed here.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
IP=185.204.197.211
HOST=kasbokarapp.com
cd "$APP_DIR"

resolve() {
  getent ahostsv4 "$1" 2>/dev/null | awk '{print $1; exit}'
}

APEX=$(resolve "$HOST" || true)
WWW=$(resolve "www.$HOST" || true)
if [ "$APEX" != "$IP" ] || [ "$WWW" != "$IP" ]; then
  echo "TLS_WAIT apex=${APEX:-none} www=${WWW:-none} want=$IP"
  exit 0
fi

python3 - <<'PY'
from pathlib import Path
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
kv["SITE_URL"] = "https://kasbokarapp.com"
kv["BETTER_AUTH_URL"] = "https://kasbokarapp.com"
kv["CADDYFILE"] = "Caddyfile.tls"
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
print("env_tls_patched")
PY

docker compose --profile with-db --profile tls up -d --remove-orphans >/dev/null
i=0
while [ "$i" -lt 30 ]; do
  i=$((i + 1))
  if curl -sS -m 8 --resolve "$HOST:443:127.0.0.1" "https://$HOST/api/health" 2>/dev/null | grep -q '"ok":true'; then
    echo "TLS_OK https://$HOST"
    exit 0
  fi
  sleep 4
done
echo "TLS_PENDING cert or health not ready yet"
exit 0
