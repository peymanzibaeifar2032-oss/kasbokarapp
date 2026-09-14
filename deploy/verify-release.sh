#!/bin/sh
# Fail unless checkout, image, health, and schema are the same release.
# No secrets printed. EXIT 0 only on full match.
set -eu
APP_DIR=${APP_DIR:-/opt/kasbokarapp}
cd "$APP_DIR"
COMPOSE="${COMPOSE:-docker compose --profile with-db --profile tls}"
EXPECT_SHA=${1:-}

if [ -z "$EXPECT_SHA" ]; then
  EXPECT_SHA=$(git rev-parse origin/main)
fi

HEAD=$(git rev-parse HEAD)
ORIGIN=$(git rev-parse origin/main)

echo "VERIFY expect=$EXPECT_SHA head=$HEAD origin=$ORIGIN"

[ "$HEAD" = "$EXPECT_SHA" ] || { echo "VERIFY_FAIL checkout $HEAD"; exit 1; }
[ "$ORIGIN" = "$EXPECT_SHA" ] || { echo "VERIFY_FAIL origin/main $ORIGIN"; exit 1; }

IMG_SHA=$($COMPOSE run --no-deps --rm --entrypoint cat web /app/BUILD_SHA 2>/dev/null | tr -d '\r\n' || true)
echo "VERIFY image_sha=$IMG_SHA"
[ "$IMG_SHA" = "$EXPECT_SHA" ] || { echo "VERIFY_FAIL image SHA"; exit 1; }

MIG=$($COMPOSE run --no-deps --rm --entrypoint ls web /app/migrations 2>/dev/null | tr -d '\r' || true)
echo "$MIG" | grep -qx "0014_calendar.sql" || { echo "VERIFY_FAIL image missing 0014"; exit 1; }
echo "$MIG" | grep -qx "0015_finance.sql" || { echo "VERIFY_FAIL image missing 0015"; exit 1; }
echo "$MIG" | grep -qx "0016_resources.sql" || { echo "VERIFY_FAIL image missing 0016"; exit 1; }

H=$(curl -sS -m 8 http://127.0.0.1:8080/api/health || true)
echo "VERIFY health=$H"
echo "$H" | grep -q '"ok":true' || { echo "VERIFY_FAIL health ok"; exit 1; }
echo "$H" | grep -q "$EXPECT_SHA" || { echo "VERIFY_FAIL health sha"; exit 1; }
echo "$H" | grep -q '"shaSource":"image"' || { echo "VERIFY_FAIL health shaSource"; exit 1; }
echo "$H" | grep -q '"m0014":true' || { echo "VERIFY_FAIL m0014"; exit 1; }
echo "$H" | grep -q '"m0015":true' || { echo "VERIFY_FAIL m0015"; exit 1; }
echo "$H" | grep -q '"m0016":true' || { echo "VERIFY_FAIL m0016"; exit 1; }
echo "$H" | grep -q 'postgres+0015' || { echo "VERIFY_FAIL db 0015 marker"; exit 1; }

DB=$($COMPOSE exec -T db psql -U kasbokar -d kasbokar -Atc \
  "select string_agg(name, ',' order by name) from _migrations where name in ('0014_calendar.sql','0015_finance.sql','0016_resources.sql');" \
  2>/dev/null | tr -d '\r' || true)
echo "VERIFY db_migrations=$DB"
echo "$DB" | grep -q "0014_calendar.sql" || { echo "VERIFY_FAIL db 0014"; exit 1; }
echo "$DB" | grep -q "0015_finance.sql" || { echo "VERIFY_FAIL db 0015"; exit 1; }
echo "$DB" | grep -q "0016_resources.sql" || { echo "VERIFY_FAIL db 0016"; exit 1; }

echo "VERIFY_OK $EXPECT_SHA"
