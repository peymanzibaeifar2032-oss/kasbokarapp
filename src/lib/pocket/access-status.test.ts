import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pocketAccessResult, pocketAccessMessage } from "./access-status.ts";

test("owner diagnostics distinguish session, old backend, outage and owner service failure", () => {
  for (const [status, data, expected] of [
    [401, {}, "login-required"], [403, {}, "not-owner"], [400, {}, "activation-required"],
    [404, {}, "activation-required"], [200, { bookings: [] }, "activation-required"],
    [0, null, "unavailable"], [500, {}, "unavailable"],
    [200, { account: { isOwner: true, canViewAppStats: false, accountEmail: "owner@example.invalid" } }, "owner-activation-required"],
    [200, { account: { isOwner: true, canViewAppStats: true, accountEmail: "owner@example.invalid" } }, "verified"],
  ] as const) assert.equal(pocketAccessResult(status, data).state, expected);
});
test("typed/forged email cannot authorize; ordinary user sees no statistics hint", () => {
  for (const data of [{ accountEmail: "owner@example.invalid" }, { account: { isOwner: "true" } }]) {
    assert.equal(pocketAccessResult(200, data).account, null);
  }
  const result = pocketAccessResult(200, { account: { isOwner: false, canViewAppStats: true, accountEmail: "u@example.invalid" } });
  assert.equal(result.account?.canViewAppStats, false);
  assert.equal(result.appStats, null);
  for (const state of ["not-owner", "activation-required", "login-required", "unavailable"] as const) {
    assert.doesNotMatch(pocketAccessMessage(state, false), /آمار/);
    assert.doesNotMatch(pocketAccessMessage(state, true), /statistic/);
  }
});
test("native return is always available during login and never itself grants owner access", () => {
  const main = readFileSync("android-tattoo-booking/app/src/main/java/com/peymanzibaeifar/tattoobooking/MainActivity.java", "utf8");
  assert.match(main, /بررسی حساب \/ بازگشت به اپ/);
  assert.match(main, /if \(pocketLoginInProgress\) \{ finishPocketLogin\(\); return; \}/);
  assert.match(main, /pocketLoginInProgress = true;\s+showPocketReturn\(true\);\s+webView.loadUrl\("https:\/\/kasbokarapp.com\/login\?next=\/studio\/pocket"\)/);
  const finish = main.slice(main.indexOf("private void finishPocketLogin"), main.indexOf("protected void onResume"));
  assert.match(finish, /CookieManager.getInstance\(\).flush\(\)/);
  assert.match(finish, /webView.loadUrl\(OFFLINE_HOME\)/);
  assert.doesNotMatch(finish, /isOwner|canViewAppStats|deliverPocketExport/);
  assert.match(main, /pocket-account-refresh/);
});
