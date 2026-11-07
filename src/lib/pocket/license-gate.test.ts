import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertCanMutate, isLicenseLockedError, setLicenseChecker } from "./license-gate.ts";

describe("license gate", () => {
  it("is a no-op outside the licensed APK bundle (website/tests)", () => {
    setLicenseChecker(() => ({ ok: false, reason: "x" }));
    assert.doesNotThrow(() => assertCanMutate());
  });
  it("enforced bundle: blocks with a readable reason, allows when valid", () => {
    (globalThis as Record<string, unknown>).__POCKET_LICENSE_ENFORCED__ = true;
    try {
      setLicenseChecker(() => ({ ok: false, reason: "مهلت مجوز تمام شده است." }));
      let err: unknown;
      try { assertCanMutate(); } catch (e) { err = e; }
      assert.ok(isLicenseLockedError(err));
      assert.match((err as Error).message, /مهلت مجوز تمام شده است\. اطلاعات شما حفظ شده/);
      setLicenseChecker(() => ({ ok: true }));
      assert.doesNotThrow(() => assertCanMutate());
      setLicenseChecker(null);
      assert.throws(() => assertCanMutate());
    } finally {
      delete (globalThis as Record<string, unknown>).__POCKET_LICENSE_ENFORCED__;
      setLicenseChecker(null);
    }
  });
});
