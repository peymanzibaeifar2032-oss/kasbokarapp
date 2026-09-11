#!/bin/sh
# Inspect the publicly served certificate only. Never reads privkey.pem.
# Must not change Caddy, DNS, or application containers.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
STATE_DIR=/var/lib/kasbokar
STATUS=$STATE_DIR/tls-status.json
STATE=$STATE_DIR/tls-monitor-state
EXPECT_SERIAL=055D352DBC35556738B9A84FAFECB2E579CF
HOSTS="kasbokarapp.com www.kasbokarapp.com"

mkdir -p "$STATE_DIR"
chmod 755 "$STATE_DIR"
touch "$STATE"
chmod 600 "$STATE"

served() {
  echo | openssl s_client -connect 127.0.0.1:443 -servername "$1" 2>/dev/null \
    | openssl x509 -noout -serial -enddate 2>/dev/null || true
}

worst=ok
min_days=9999
serials=""
for h in $HOSTS; do
  info=$(served "$h")
  ser=$(echo "$info" | awk -F= '/serial=/{print $2}')
  end=$(echo "$info" | sed -n 's/notAfter=//p')
  if [ -z "$ser" ] || [ -z "$end" ]; then
    echo "TLS_MONITOR_WARN host=$h unreachable_or_no_cert"
    sh "$APP_DIR/deploy/notify.sh" warning "tls cert unread for $h" || true
    worst=warn
    continue
  fi
  end_epoch=$(date -d "$end" +%s)
  now=$(date -u +%s)
  days=$(( (end_epoch - now) / 86400 ))
  echo "TLS_MONITOR host=$h serial=$ser days_left=$days"
  serials="$serials $ser"
  if [ "$days" -lt "$min_days" ]; then min_days=$days; fi
  if [ "$ser" != "$EXPECT_SERIAL" ]; then
    echo "TLS_MONITOR_WARN unexpected_serial host=$h"
    worst=warn
  fi
done

status=$worst
if [ "$min_days" -eq 9999 ]; then
  status=warn
  min_days=-1
elif [ "$min_days" -le 3 ]; then status=critical
elif [ "$min_days" -le 7 ]; then status=critical
elif [ "$min_days" -le 14 ]; then status=warn
elif [ "$min_days" -le 30 ]; then status=warn
elif [ "$min_days" -le 45 ]; then status=warn
fi

# Public status file: no serial, no fingerprint, no key path.
printf '{"status":"%s","days_left":%s,"checked_at":"%s"}\n' \
  "$status" "$min_days" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STATUS.tmp"
chmod 644 "$STATUS.tmp"
mv -f "$STATUS.tmp" "$STATUS"

band=""
if [ "$min_days" -le 3 ]; then band=3
elif [ "$min_days" -le 7 ]; then band=7
elif [ "$min_days" -le 14 ]; then band=14
elif [ "$min_days" -le 30 ]; then band=30
elif [ "$min_days" -le 45 ]; then band=45
fi

if [ -n "$band" ]; then
  last=$(grep "^band=" "$STATE" 2>/dev/null | tail -1 | cut -d= -f2 || true)
  if [ "$last" != "$band" ]; then
    echo "band=$band" >> "$STATE"
    sh "$APP_DIR/deploy/notify.sh" warning "tls expiry band ${band}d days_left=$min_days status=$status" || true
  fi
else
  echo "band=ok" >> "$STATE"
fi

echo "TLS_MONITOR_STATUS $status days_left=$min_days"
exit 0
