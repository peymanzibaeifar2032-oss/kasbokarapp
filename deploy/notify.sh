#!/bin/sh
# Notification adapter. Default sink is local log only.
# Later: SMS / Email / Push via env, never commit secrets.
# Does not print secrets. Failure here must not take the site down.
set -eu
LEVEL=${1:-info}
MSG=${2:-}
CHAN=${NOTIFY_CHANNEL:-log}

case "$CHAN" in
  log)
    logger -t kasbokar-notify -p "user.$LEVEL" -- "$MSG" || true
    echo "NOTIFY_$LEVEL $MSG"
    ;;
  *)
    logger -t kasbokar-notify -p "user.warning" -- "unknown channel $CHAN: $MSG" || true
    echo "NOTIFY_UNKNOWN_CHANNEL $CHAN"
    ;;
esac
exit 0
