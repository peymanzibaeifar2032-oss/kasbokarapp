import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

// Contract test for the owner self-license path used by the Pocket app (no production data or keys).
const writes = readFileSync(new URL("./writes.ts", import.meta.url), "utf8");
const save = readFileSync(new URL("../../routes/api/save.ts", import.meta.url), "utf8");

test("pocketLicenseSelf: only via the owner gate (studio owner role + requireAdmin), device is the only payload", () => {
  const fn = writes.slice(writes.indexOf("async function performPocketLicenseOwnerAction"), writes.indexOf("async function performPocketLicenseOwnerAction") + 2000);
  assert.match(fn, /actor\?\.role !== "owner"\) throw new Error\("Forbidden/);
  assert.match(fn, /await requireAdmin\(userId\)/);
  assert.ok(fn.indexOf("requireAdmin") < fn.indexOf('case "pocketLicenseSelf"'), "gate runs before the action");
  assert.match(fn, /selfLicense\(sql, userId, \{ device: raw\.device \}\)/);
  const dispatch = writes.slice(writes.lastIndexOf('case "pocketLicenseSelf":'), writes.lastIndexOf('case "pocketLicenseSelf":') + 120);
  assert.match(dispatch, /performPocketLicenseOwnerAction\(userId, type, payload\)/);
  assert.ok(!/email/i.test(fn.slice(0, fn.indexOf("switch"))), "no email-based grant");
});

test("/api/save: no session → 401, Forbidden → 403, session read only from request headers", () => {
  assert.match(save, /if \(!session\?\.user\) throw new UnauthorizedError\(\)/);
  assert.match(save, /UnauthorizedError\) return json\(\{ error: "لطفاً دوباره با ایمیل وارد شوید\." \}, 401\)/);
  assert.match(save, /\/Forbidden\|دسترسی\/\.test\(message\) \? 403/);
  assert.match(save, /auth\.api\.getSession\(\{ headers: request\.headers \}\)/);
});
