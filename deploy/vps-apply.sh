#!/bin/sh
# Idempotent VPS apply: git main, reverse proxy :80, backup, firewall, smoke.
# Does not change public DNS. Does not print secrets.
set -eu
APP_DIR=/opt/kasbokarapp
REPORT=/opt/kasbokarapp/PROD_REPORT.txt
umask 077

{
  echo "=== kasbokar VPS apply $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
  cd "$APP_DIR"
  export GIT_SSH_COMMAND='ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new'

  echo "-- github deploy key --"
  ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -T git@github.com 2>&1 | head -3 || true
  git fetch origin main
  git reset --hard origin/main
  chmod +x deploy/*.sh

  echo "-- authorized_keys unique --"
  python3 - <<'PY'
from pathlib import Path
p = Path("/root/.ssh/authorized_keys")
p.parent.mkdir(mode=0o700, exist_ok=True)
lines = [ln.rstrip() for ln in p.read_text().splitlines() if ln.strip()] if p.exists() else []
out, seen = [], set()
for ln in lines:
    if ln in seen:
        continue
    seen.add(ln)
    out.append(ln)
p.write_text("\n".join(out) + ("\n" if out else ""))
p.chmod(0o600)
print("keys", len(out), "deploy", any("kasbokarapp-deploy" in x for x in out))
PY

  echo "-- .env public urls (secrets kept) --"
  python3 - <<'PY'
from pathlib import Path
p = Path("/opt/kasbokarapp/.env")
kv = {}
if p.exists():
    for line in p.read_text().splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        kv[k.strip()] = v
kv["STANDALONE"] = "true"
kv["NODE_ENV"] = "production"
kv["SITE_URL"] = "http://185.204.197.211"
kv["BETTER_AUTH_URL"] = "http://185.204.197.211"
kv["TRUSTED_ORIGINS"] = ",".join([
    "http://185.204.197.211",
    "http://185.204.197.211:8080",
    "https://kasbokarapp.com",
    "http://kasbokarapp.com",
    "https://www.kasbokarapp.com",
    "http://www.kasbokarapp.com",
])
kv["NITRO_PRESET"] = "node-server"
kv["PORT"] = "8080"
kv["APP_PORT"] = "8080"
kv["SITE_HOST"] = "kasbokarapp.com"
kv["CADDY_EMAIL"] = kv.get("CADDY_EMAIL") or "ops@kasbokarapp.com"
kv["CADDYFILE"] = "Caddyfile"
kv["COMPOSE_PROFILES"] = "with-db,tls"
kv["NPM_REGISTRY"] = "https://mirror.abrha.net/repository/npm"
if "BETTER_AUTH_SECRET" not in kv or "POSTGRES_PASSWORD" not in kv or "DATABASE_URL" not in kv:
    raise SystemExit("missing required secrets in .env")
p.write_text("".join(f"{k}={v}\n" for k, v in kv.items()))
p.chmod(0o600)
print("env keys", len(kv))
PY

  echo "-- firewall ufw 22/80/443 --"
  export DEBIAN_FRONTEND=noninteractive
  command -v ufw >/dev/null || apt-get install -y ufw
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
  ufw status | head -20

  echo "-- compose up --"
  docker compose --profile with-db --profile tls up -d --build --remove-orphans

  echo "-- wait health --"
  ok=0
  i=0
  while [ "$i" -lt 40 ]; do
    i=$((i + 1))
    if curl -sf -m 4 http://127.0.0.1:8080/api/health | grep -q '"ok":true'; then
      ok=1
      break
    fi
    sleep 3
  done
  [ "$ok" = 1 ] || { echo "health timeout"; docker compose --profile with-db --profile tls ps; docker compose --profile with-db logs --tail=40 web; exit 1; }

  echo "-- restart policy --"
  docker inspect -f '{{.Name}} restart={{.HostConfig.RestartPolicy.Name}}' \
    kasbokarapp-web-1 kasbokarapp-db-1 kasbokarapp-caddy-1 kasbokarapp-backup-1 2>/dev/null || true
  docker compose --profile with-db --profile tls ps

  echo "-- local :80 proxy --"
  curl -sS -m 8 -o /dev/null -w "caddy80:%{http_code}\n" http://127.0.0.1/ || true

  echo "-- smoke --"
  sh deploy/smoke.sh || true

  echo "-- volumes --"
  docker volume ls | grep kasbokar || true

  echo "=== apply finished ==="
} 2>&1 | tee "$REPORT"
echo "report: $REPORT"
