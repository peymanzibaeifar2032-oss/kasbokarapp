import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHash } from "node:crypto";
import { PINNED_LICENSE_KEYS } from "./license-keys.ts";
import { evaluateLicense, normalizeActivationCode, recheckPayload, ROLLBACK_TOLERANCE_MS } from "./license.ts";
import { makeTestIssuer, testInstall } from "../../../scripts/pocket-license-fixture.mjs";

// Synthetic fixtures only: a throwaway key generated per run.
const iss = makeTestIssuer();
const other = makeTestIssuer();
const { device } = testInstall();
const now = Date.now();
const s = Math.floor(now / 1000);
const good = { lid: "lic_test", dev: device, iat: s, nbf: s - 60, exp: s + 30 * 86400, olu: s + 72 * 3600 };
const ev = (token: string | null, o: Partial<{ device: string; now: number; maxTrusted: number }> = {}) =>
  evaluateLicense(token, { device, now, maxTrusted: 0, keys: iss.keys, ...o }).then((r) => r.status);

describe("pocket offline license", () => {
  it("valid token verifies", async () => assert.equal(await ev(iss.issue(good)), "valid"));
  it("no token", async () => assert.equal(await ev(null), "none"));
  it("tampered payload / signature / wrong issuer key rejected", async () => {
    const t = iss.issue(good);
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), exp: s + 9e8 })).toString("base64url");
    assert.equal(await ev(`${forged}.${sig}`), "invalid");
    assert.equal(await ev(`${body}.${Buffer.from(sig, "base64url").reverse().toString("base64url")}`), "invalid");
    assert.equal(await ev(other.issue(good)), "invalid"); // unknown kid
    assert.equal(await evaluateLicense(other.issue({ ...good }), { device, now, maxTrusted: 0, keys: [{ kid: other.kid, spki: iss.spki }] }).then((r) => r.status), "invalid"); // kid spoof
    assert.equal(await ev("garbage"), "invalid");
  });
  it("wrong device / audience / issuer rejected", async () => {
    assert.equal(await ev(iss.issue(good), { device: testInstall().device }), "invalid");
    assert.equal(await ev(iss.issue({ ...good, aud: "other" })), "invalid");
    assert.equal(await ev(iss.issue({ ...good, iss: "evil.example" })), "invalid");
    assert.equal(await ev(iss.issue({ ...good, olu: good.exp + 10 })), "invalid");
  });
  it("offline lease expiry and full expiry", async () => {
    assert.equal(await ev(iss.issue(good), { now: now + 73 * 3600e3 }), "offline_expired");
    assert.equal(await ev(iss.issue(good), { now: now + 31 * 86400e3 }), "expired");
    assert.equal(await ev(iss.issue({ ...good, nbf: s + 86400 })), "not_yet");
  });
  it("clock rollback beyond tolerance is detected", async () => {
    assert.equal(await ev(iss.issue(good), { now: now - ROLLBACK_TOLERANCE_MS - 60e3 }), "clock");
    assert.equal(await ev(iss.issue(good), { now: now - 60e3 }), "valid");
    assert.equal(await ev(iss.issue(good), { maxTrusted: now + 3600e3 }), "clock");
  });
  it("sync recheck for the mutation gate", () => {
    assert.equal(recheckPayload({ ...good, v: 1, iss: "", aud: "", kid: "", self: false, n: "" }, now, 0).status, "valid");
    assert.equal(recheckPayload({ ...good, v: 1, iss: "", aud: "", kid: "", self: false, n: "" }, now + 80 * 3600e3, 0).status, "offline_expired");
    assert.equal(recheckPayload(undefined, now, 0).status, "none");
  });
  it("pinned production trust anchor is present and self-consistent (kid = sha256(spki))", () => {
    assert.ok(PINNED_LICENSE_KEYS.length >= 1);
    for (const k of PINNED_LICENSE_KEYS) {
      assert.equal(k.kid, "k" + createHash("sha256").update(Buffer.from(k.spki, "base64")).digest("hex").slice(0, 16));
    }
  });
  it("activation code normalization", () => {
    assert.equal(normalizeActivationCode("abcde 12345 fghjk 6789o"), "ABCDE-12345-FGHJK-67890");
    assert.equal(normalizeActivationCode("abc"), null);
  });
});
