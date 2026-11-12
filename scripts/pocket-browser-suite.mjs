// Runs all Pocket browser checks against a TEST build of the licensed bundle (dist/pocket-offline-test)
// whose only extra trust anchor is a throwaway key generated for this run. Never touches public/ or APK assets.
import { execFileSync } from "node:child_process";
import { makeTestIssuer, testInstall } from "./pocket-license-fixture.mjs";

const issuer = makeTestIssuer();
const { secret, device } = testInstall();
const s = Math.floor(Date.now() / 1000);
const token = issuer.issue({ lid: "lic_browser_test", dev: device, iat: s, nbf: s - 60, exp: s + 30 * 86400, olu: s + 72 * 3600 });
const selfInstall = testInstall();
const selfToken = issuer.issue({ lid: "lic_self_test", dev: selfInstall.device, iat: s, nbf: s - 60, exp: s + 365 * 86400, olu: s + 72 * 3600, self: true });
const otherToken = issuer.issue({ lid: "lic_self_test", dev: testInstall().device, iat: s, nbf: s - 60, exp: s + 365 * 86400, olu: s + 72 * 3600, self: true });
const env = { ...process.env, POCKET_LICENSE_TEST_KEYS: JSON.stringify(issuer.keys) };
execFileSync(process.execPath, ["scripts/build-pocket-apk-assets.mjs"], { stdio: "inherit", env });
const run = (script, extra = {}) => {
  console.log(`\n=== ${script} ===`);
  execFileSync(process.execPath, [script], { stdio: "inherit", env: { ...process.env, POCKET_ROOT: "dist/pocket-offline-test", POCKET_TEST_LICENSE: JSON.stringify({ secret, token }), ...extra } });
};
const only = process.argv.slice(2);
for (const script of ["scripts/pocket-owner-browser.mjs", "scripts/pocket-features-browser.mjs", "scripts/pocket-visual-1144.mjs", "scripts/pocket-license-browser.mjs", "scripts/pocket-sms-browser.mjs", "scripts/pocket-locked-browser.mjs", "scripts/pocket-owner-enroll-browser.mjs", "scripts/pocket-calendar-locale-browser.mjs"]) {
  if (!only.length || only.some((o) => script.includes(o))) run(script, script.includes("owner-enroll") ? { POCKET_TEST_LICENSE: "", POCKET_TEST_SELF: JSON.stringify({ secret: selfInstall.secret, token: selfToken }), POCKET_TEST_SELF_OTHER: JSON.stringify({ token: otherToken }) } : script.includes("license-browser") ? { POCKET_TEST_ISSUER_NOTE: "1", POCKET_TEST_EXPIRED: JSON.stringify({ secret, token: issuer.issue({ lid: "lic_browser_test", dev: device, iat: s - 40 * 86400, nbf: s - 41 * 86400, exp: s - 86400, olu: s - 86400 }) }) } : {});
}
