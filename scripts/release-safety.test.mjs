import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { projectRoot } from "./with-app-env.mjs";

const releasePath = join(projectRoot(), "deploy/release.sh");
const src = readFileSync(releasePath, "utf8");

test("release.sh is valid POSIX shell", () => {
  execFileSync("sh", ["-n", releasePath], { stdio: "pipe" });
});

test("release recreates only the web service", () => {
  assert.match(src, /\$COMPOSE up -d --no-deps --force-recreate web/);
  assert.doesNotMatch(src, /up -d --force-recreate --remove-orphans/);
  assert.doesNotMatch(src, /up -d --no-build --remove-orphans/);
});

test("backup is mandatory before schema-changing release", () => {
  assert.match(src, /fail "backup-dump"/);
  assert.match(src, /fail "backup-empty"/);
  assert.match(src, /fail "backup-list"/);
  assert.match(src, /fail "backup-invalid"/);
  assert.doesNotMatch(src, /backup skipped/);
  assert.doesNotMatch(src, /backup list skipped/);
});

test("fail-closed after web start; no automatic DB restore", () => {
  assert.match(src, /DB_MAY_HAVE_CHANGED=0/);
  assert.match(src, /DB_MAY_HAVE_CHANGED=1/);
  const start = src.indexOf("DB_MAY_HAVE_CHANGED=1");
  const up = src.indexOf("$COMPOSE up -d --no-deps --force-recreate web");
  assert.ok(start >= 0 && up > start);
  assert.match(src, /not restoring DB/);
  assert.match(src, /not deploying OLD_SHA\/prev image/);
  assert.doesNotMatch(src, /pg_restore --no-owner/);
  assert.doesNotMatch(src, /kasbokar_restore/);
});

test("preserve_local copies local files independently", () => {
  assert.match(
    src,
    /if \[ -f deploy\/cleanup-category-samples\.sh \]; then\n    cp -a deploy\/cleanup-category-samples\.sh/,
  );
  assert.match(
    src,
    /if \[ -f PROD_REPORT\.txt \]; then\n    cp -a PROD_REPORT\.txt/,
  );
  assert.doesNotMatch(src, /(?:^|\n)\s*git clean\b/);
});

test("existing release hardening remains", () => {
  assert.match(src, /shaSource":"image"/);
  assert.match(src, /m0014":true/);
  assert.match(src, /m0015":true/);
  assert.match(src, /m0016":true/);
  assert.match(src, /jalali-month-v1/);
  assert.match(src, /PREFLIGHT_FAIL active_null_slot_end/);
  assert.match(src, /deploy\/smoke\.sh/);
  assert.match(src, /deploy\/verify-release\.sh/);
  assert.match(src, /kasbokar-release\.lock/);
});

test("phase0 and smoke always remove automated test listings", () => {
  const phase0 = readFileSync(join(projectRoot(), "deploy/phase0-cleanup.sh"), "utf8");
  const smoke = readFileSync(join(projectRoot(), "deploy/smoke.sh"), "utf8");
  const map = readFileSync(join(projectRoot(), "src/lib/server/db-map.ts"), "utf8");
  assert.match(phase0, /تست اسموک/);
  assert.match(phase0, /E2E TEST - DELETE ME/);
  assert.match(phase0, /booking_holds/);
  assert.match(smoke, /trap cleanup_e2e EXIT/);
  assert.match(smoke, /تست اسموک/);
  assert.match(map, /b\.name <> 'تست اسموک'/);
});

test("CI production build does not run database migrations", () => {
  const ci = readFileSync(join(projectRoot(), ".github/workflows/ci.yml"), "utf8");
  const pkg = JSON.parse(readFileSync(join(projectRoot(), "package.json"), "utf8"));
  assert.match(ci, /npm run build/);
  assert.doesNotMatch(ci, /db:migrate/);
  assert.match(pkg.scripts.build, /vite build/);
  assert.doesNotMatch(pkg.scripts.build, /db:migrate/);
  assert.match(pkg.scripts["db:migrate"], /migrate\.mjs/);
});

test("manual deploy-vps fails closed when VPS secrets are missing", () => {
  const wf = readFileSync(join(projectRoot(), ".github/workflows/deploy-vps.yml"), "utf8");
  assert.match(wf, /workflow_dispatch/);
  assert.match(wf, /Manual deploy-vps requires VPS_HOST/);
  assert.match(wf, /exit 1/);
});

test("watch matches live health calendar marker and skips when current", () => {
  const watchPath = join(projectRoot(), "deploy/watch-main.sh");
  const watch = readFileSync(watchPath, "utf8");
  execFileSync("sh", ["-n", watchPath], { stdio: "pipe" });
  assert.doesNotMatch(watch, /grep -q 'kasbokar-jalali-month-v1'/);
  assert.match(watch, /grep -q 'jalali-month-v1'/);
  assert.match(watch, /"ok":true/);
  assert.match(watch, /WATCH_SKIP/);
  assert.match(watch, /"shaSource":"image"/);
  assert.match(watch, /"m0016":true/);
});

test("smoke sends localhost session cookies from the production jar", () => {
  const smoke = readFileSync(join(projectRoot(), "deploy/smoke.sh"), "utf8");
  execFileSync("sh", ["-n", join(projectRoot(), "deploy/smoke.sh")], { stdio: "pipe" });
  assert.match(smoke, /SMOKE_ORIGIN:-\$BASE/);
  assert.match(smoke, /align-smoke-cookie-jar\.py/);
  assert.match(smoke, /ingest/);
  assert.match(smoke, /-H "Cookie: \$ck"/);
  assert.doesNotMatch(smoke, /SMOKE_ORIGIN:-http:\/\/185\.204\.197\.211/);
  assert.doesNotMatch(smoke, /curl -sS -m 20 -c "\$JAR" -b "\$JAR"/);
});
