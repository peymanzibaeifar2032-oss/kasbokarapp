#!/bin/sh
# When DNS already points here, switch Caddy to TLS and SITE_URL to https.
# Idempotent. Does not print .env. Does not restart Caddy every watch tick.
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

https_ok() {
  curl -sS -m 10 --resolve "$HOST:443:127.0.0.1" "https://$HOST/api/health" 2>/dev/null | grep -q '"ok":true'
}

if https_ok; then
  echo "TLS_OK https://$HOST"
  exit 0
fi

NEED_UP=0
if ! grep -q '^CADDYFILE=Caddyfile.tls$' .env 2>/dev/null; then
  NEED_UP=1
fi
if ! docker compose --profile with-db --profile tls ps -q caddy 2>/dev/null | grep -q .; then
  NEED_UP=1
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

if [ "$NEED_UP" = "1" ]; then
  docker compose --profile with-db --profile tls up -d --remove-orphans
else
  docker compose --profile with-db --profile tls exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 || \
    docker compose --profile with-db --profile tls up -d caddy
fi

i=0
while [ "$i" -lt 45 ]; do
  i=$((i + 1))
  if https_ok; then
    echo "TLS_OK https://$HOST"
    exit 0
  fi
  sleep 4
done

echo "TLS_PENDING cert or health not ready yet"
docker compose --profile with-db --profile tls logs --tail 40 caddy 2>/dev/null | grep -E 'acme|certificate|error|tls|challenge' | tail -20 || true
exit 0
