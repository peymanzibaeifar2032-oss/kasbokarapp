#!/bin/sh
# One-shot TLS rotation leftover cleanup. Never touches live Production certs.
# Never decrypts or prints keys. Idempotent.
set -eu
FLAG=/var/lib/kasbokar/tls-cleanup-20260911.done
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
mkdir -p /var/lib/kasbokar

install_monitor() {
  install -m 644 "$APP_DIR/deploy/kasbokar-tls-monitor.service" /etc/systemd/system/kasbokar-tls-monitor.service
  install -m 644 "$APP_DIR/deploy/kasbokar-tls-monitor.timer" /etc/systemd/system/kasbokar-tls-monitor.timer
  systemctl daemon-reload
  systemctl enable --now kasbokar-tls-monitor.timer
  echo "TLS_MONITOR_TIMER_ON"
}

# Always keep the monitor installed, even after the flag is set.
if [ -f "$APP_DIR/deploy/kasbokar-tls-monitor.timer" ]; then
  install_monitor || true
fi

if [ -f "$FLAG" ]; then
  echo "TLS_CLEANUP_SKIP already_done"
  exit 0
fi

# Refuse to touch live Production material.
for p in \
  "$APP_DIR/certs/fullchain.pem" \
  "$APP_DIR/certs/privkey.pem" \
  /root/kasbokar-tls-next/privkey.pem
do
  if [ -e "$p" ]; then
    echo "KEEP $p"
  fi
done

# Confirm nothing running references the retired encrypted bundle.
ENC=/root/le-rotate.enc
if [ -e "$ENC" ]; then
  if command -v lsof >/dev/null 2>&1 && lsof "$ENC" >/dev/null 2>&1; then
    echo "TLS_CLEANUP_STOP $ENC is open"
    exit 1
  fi
  if grep -R --binary-files=without-match -l "le-rotate.enc" /etc/systemd/system 2>/dev/null | grep -q .; then
    echo "TLS_CLEANUP_STOP systemd_reference"
    exit 1
  fi
  if shred -n 3 -u "$ENC" 2>/dev/null; then
    echo "SHREDDED $ENC"
  else
    rm -f "$ENC"
    echo "REMOVED $ENC"
  fi
else
  echo "ABSENT $ENC"
fi

# Mark compromised backups: keep for retention, never reuse as live TLS.
for d in /root/kasbokar-tls-backup-*; do
  [ -d "$d" ] || continue
  umask 077
  printf '%s\n' \
    "COMPROMISED_DO_NOT_USE_FOR_PRODUCTION" \
    "serial=0534683C20B8888A21D29D7A0FEBE665E9A0" \
    "revoked=2026-09-11" \
    "retain_until=2027-03-11" \
    > "$d/DO_NOT_USE"
  chmod 600 "$d/DO_NOT_USE" 2>/dev/null || true
  chmod 600 "$d/privkey.pem" 2>/dev/null || true
  echo "MARKED_COMPROMISED $d"
done

date -u +%Y-%m-%dT%H:%M:%SZ > "$FLAG"
chmod 600 "$FLAG"
echo "TLS_CLEANUP_OK"
sh "$APP_DIR/deploy/tls-monitor.sh" || true
