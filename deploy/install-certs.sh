#!/bin/sh
# Enable HTTPS using cert files already in /opt/kasbokarapp/certs.
# Does not contact Let's Encrypt. Does not print secrets.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
cd "$APP_DIR"
if [ ! -s certs/fullchain.pem ] || [ ! -s certs/privkey.pem ]; then
  echo "CERTS_MISSING put fullchain.pem and privkey.pem in $APP_DIR/certs"
  exit 1
fi
chmod 600 certs/privkey.pem
chmod 644 certs/fullchain.pem
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
print("env_https_patched")
PY
docker compose --profile with-db --profile tls up -d --remove-orphans
i=0
while [ "$i" -lt 20 ]; do
  i=$((i + 1))
  if curl -sS -m 8 --resolve kasbokarapp.com:443:127.0.0.1 https://kasbokarapp.com/api/health 2>/dev/null | grep -q '"ok":true'; then
    echo "TLS_OK https://kasbokarapp.com"
    exit 0
  fi
  sleep 2
done
echo "TLS_PENDING local https health not ready"
docker compose --profile with-db --profile tls logs --tail 15 caddy || true
exit 1
