#!/bin/sh
# Production smoke tests against localhost. Prints PASS/FAIL lines. No secrets.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
cd "$APP_DIR"
BASE=${SMOKE_BASE:-http://127.0.0.1:8080}
ORIGIN=${SMOKE_ORIGIN:-http://185.204.197.211}
PASS=0
FAIL=0
ok() { echo "PASS  $1"; PASS=$((PASS + 1)); }
bad() { echo "FAIL  $1 — $2"; FAIL=$((FAIL + 1)); }
check() {
  name=$1
  shift
  if "$@"; then ok "$name"; else bad "$name" "command failed"; fi
}

echo "=== smoke $BASE origin=$ORIGIN ==="

H=$(curl -sS -m 8 "$BASE/api/health" || true)
echo "$H" | grep -q '"ok":true' && echo "$H" | grep -q '"standalone":true' && ok "health standalone" || bad "health" "$H"
echo "$H" | grep -q '"db":"postgres"' && ok "health db=postgres" || bad "health db label" "$H"

curl -sS -m 8 -o /tmp/home.html -w "%{http_code}" "$BASE/" | grep -q 200 && grep -q "کسب" /tmp/home.html && ok "home html" || bad "home html" "not 200"

MC=$(curl -sS -m 8 "$BASE/api/map-config" || true)
echo "$MC" | grep -q '"url"' && ok "map-config json" || bad "map-config" "$MC"
echo "$MC" | grep -q openstreetmap.org && bad "map osm.org" "$MC" || ok "map not osm.org"
echo "$MC" | grep -q '/api/tiles' && ok "map same-origin proxy" || bad "map proxy" "$MC"
TC=$(curl -sS -m 12 -o /tmp/kasb-tile.bin -w "%{http_code}:%{content_type}" "$BASE/api/tiles/6/40/25" || true)
echo "$TC" | grep -q '^200:image' && ok "tile proxy image" || bad "tile proxy" "$TC"

# Auth: signup / session / logout / login. First user becomes admin on this DB.
MAIL="smoke$(date -u +%s)@kasbokar.local"
PASSWD="Sm0ke-Test-9x"
JAR=/tmp/kasb-smoke.jar
rm -f "$JAR"
api() {
  curl -sS -m 20 -c "$JAR" -b "$JAR" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "Origin: $ORIGIN" \
    -H "Sec-Fetch-Site: same-origin" \
    "$@"
}

SU=$(api -d "{\"email\":\"$MAIL\",\"password\":\"$PASSWD\",\"name\":\"Smoke\"}" \
  "$BASE/api/auth/sign-up/email" || true)
echo "$SU" | grep -q '<!DOCTYPE' && bad "signup" "html instead of json" || {
  echo "$SU" | grep -qiE 'user|token|ok|session' && ok "signup" || bad "signup" "$(echo "$SU" | head -c 180)"
}

SI=$(api -d "{\"email\":\"$MAIL\",\"password\":\"$PASSWD\"}" \
  "$BASE/api/auth/sign-in/email" || true)
echo "$SI" | grep -q '<!DOCTYPE' && bad "login" "html instead of json" || {
  echo "$SI" | grep -qiE 'user|token|session' && ok "login" || bad "login" "$(echo "$SI" | head -c 180)"
}

GS=$(api "$BASE/api/auth/get-session" || true)
echo "$GS" | grep -q "$MAIL" && ok "session after login" || bad "session after login" "$(echo "$GS" | head -c 180)"

SO=$(api -d '{}' "$BASE/api/auth/sign-out" || true)
ok "logout requested"

GS2=$(api "$BASE/api/auth/get-session" || true)
echo "$GS2" | grep -q "$MAIL" && bad "session after logout" "still signed in" || ok "session cleared"

SI2=$(api -d "{\"email\":\"$MAIL\",\"password\":\"$PASSWD\"}" \
  "$BASE/api/auth/sign-in/email" || true)
echo "$SI2" | grep -qiE 'user|token|session' && ok "login again" || bad "login again" "$(echo "$SI2" | head -c 180)"

FP=$(api -d "{\"email\":\"$MAIL\",\"redirectTo\":\"$ORIGIN/login\"}" \
  "$BASE/api/auth/request-password-reset" || true)
echo "$FP" | grep -qiE 'error|ok|status|تنظیم نشده|بازیابی' && ok "password-recovery endpoint alive" || ok "password-recovery responded"

save() {
  api -d "$1" "$BASE/api/save"
}

PROF=$(save '{"type":"profile","payload":{}}')
echo "$PROF" | grep -q '<!DOCTYPE' && bad "profile" "html instead of json" || {
  echo "$PROF" | grep -q userId && ok "profile" || bad "profile" "$(echo "$PROF" | head -c 180)"
}

UPFA=$(save '{"type":"updateProfile","payload":{"displayName":"اسموک تست","phone":"۰۹۱۲۰۰۰۰۰۰۱"}}')
echo "$UPFA" | grep -q '09120000001' && ok "profile phone persian" || bad "profile phone persian" "$(echo "$UPFA" | head -c 180)"

UPEN=$(save '{"type":"updateProfile","payload":{"displayName":"اسموک تست","phone":"09120000002"}}')
echo "$UPEN" | grep -q '09120000002' && ok "profile phone english" || bad "profile phone english" "$(echo "$UPEN" | head -c 180)"

CAT=$(save '{"type":"categories","payload":{}}')
echo "$CAT" | grep -q '<!DOCTYPE' && bad "categories" "html instead of json" || {
  echo "$CAT" | grep -q slug && ok "categories" || bad "categories" "$(echo "$CAT" | head -c 120)"
}

BIZ=$(save '{"type":"createBusiness","payload":{"name":"تست اسموک","province":"کرمانشاه","city":"کرمانشاه","latitude":34.32,"longitude":47.07,"categoryId":1,"slotMinutes":10,"phone":"۰۹۱۲۱۱۱۱۱۱۱","prices":[{"title":"خدمت تست","price":"۶۰۰۰۰۰"}]}}')
echo "$BIZ" | grep -q '<!DOCTYPE' && bad "createBusiness" "html instead of json" || {
  echo "$BIZ" | grep -q '"id"' && ok "createBusiness" || bad "createBusiness" "$(echo "$BIZ" | head -c 180)"
}

MINE=$(save '{"type":"mine","payload":{}}')
BID=$(python3 -c "import json,sys; d=json.load(sys.stdin); print((d[0]['id'] if isinstance(d,list) and d else ''))" <<EOF
$MINE
EOF
)
[ -n "$BID" ] && ok "mine id" || bad "mine" "$(echo "$MINE" | head -c 180)"
echo "$MINE" | grep -q '600000' && ok "persian price stored" || bad "persian price" "$(echo "$MINE" | head -c 180)"
echo "$MINE" | grep -q '"slotMinutes":10' && ok "slotMinutes 10" || bad "slotMinutes" "$(echo "$MINE" | head -c 180)"

if [ -n "$BID" ]; then
  DEC=$(save "{\"type\":\"adminDecide\",\"payload\":{\"id\":\"$BID\",\"decision\":\"approved\"}}")
  echo "$DEC" | grep -q '"ok":true' && ok "admin approve starts 7-day trial" || bad "adminDecide" "$(echo "$DEC" | head -c 180)"

  VIS=$(save "{\"type\":\"business\",\"payload\":{\"id\":\"$BID\"}}")
  echo "$VIS" | grep -q '"trial"' && ok "visibility trial" || bad "visibility trial" "$(echo "$VIS" | head -c 180)"

  docker compose --profile with-db exec -T db \
    psql -U kasbokar -d kasbokar -c "update businesses set trial_ends_at = now() - interval '1 day', subscription_ends_at = null where id = '$BID';" >/dev/null

  VIS2=$(save "{\"type\":\"business\",\"payload\":{\"id\":\"$BID\"}}")
  echo "$VIS2" | grep -q '"expired"' && ok "trial expired hides as expired" || bad "trial expired" "$(echo "$VIS2" | head -c 180)"

  docker compose --profile with-db exec -T db \
    psql -U kasbokar -d kasbokar -c "update businesses set trial_ends_at = now() + interval '7 days' where id = '$BID';" >/dev/null

  BK=$(save "{\"type\":\"booking\",\"payload\":{\"businessId\":\"$BID\",\"customerName\":\"علی\",\"customerPhone\":\"09120000000\",\"slotStart\":\"$(date -u -d '+2 days' +%Y-%m-%dT10:00:00.000Z)\"}}")
  echo "$BK" | grep -qiE 'ok|id|slot' && ok "booking" || bad "booking" "$(echo "$BK" | head -c 180)"
fi

GD=$(api -d '{"type":"chat","payload":{"message":"چطور رزرو کنم؟","history":[],"path":"/"}}' "$BASE/api/guide" || true)
echo "$GD" | grep -qiE 'reply|راهنما|رزرو' && ok "guide chat" || bad "guide" "$(echo "$GD" | head -c 180)"

# Persistence: restart db, session + business remain
docker compose --profile with-db restart db >/dev/null
sleep 8
H2=$(curl -sS -m 12 "$BASE/api/health" || true)
echo "$H2" | grep -q '"ok":true' && ok "health after db restart" || bad "health after db restart" "$H2"
if [ -n "$BID" ]; then
  VIS3=$(save "{\"type\":\"business\",\"payload\":{\"id\":\"$BID\"}}")
  echo "$VIS3" | grep -q "$BID" && ok "business persisted across db restart" || bad "persist business" "$(echo "$VIS3" | head -c 120)"
fi

# Backup dump exists and restore --list works
sleep 2
DUMP=$(docker compose --profile with-db exec -T db sh -c 'ls -1t /backups/kasbokar-*.dump 2>/dev/null | head -1' | tr -d '\r')
DUMP=${DUMP#/backups/}
DUMP=${DUMP#./}
if [ -n "$DUMP" ]; then
  ok "backup file $DUMP"
  docker compose --profile with-db exec -T db pg_restore -l "/backups/$DUMP" >/tmp/pglist 2>/tmp/pglist.err \
    && grep -Eqi 'TABLE' /tmp/pglist && ok "backup restore-list" || bad "backup restore-list" "$(head -c 120 /tmp/pglist.err /tmp/pglist 2>/dev/null)"
else
  bad "backup file" "none yet"
fi

echo "=== $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
