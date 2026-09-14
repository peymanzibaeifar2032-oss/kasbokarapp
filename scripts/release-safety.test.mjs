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
  assert.match(src, /kasbokar-jalali-month-v1/);
  assert.match(src, /PREFLIGHT_FAIL active_null_slot_end/);
  assert.match(src, /deploy\/smoke\.sh/);
  assert.match(src, /deploy\/verify-release\.sh/);
  assert.match(src, /kasbokar-release\.lock/);
});
