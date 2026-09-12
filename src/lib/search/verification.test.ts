import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveVerificationLevel,
  nextVerificationLevel,
} from "./verification.ts";

describe("verification levels", () => {
  it("does not treat admin approval as identity proof", () => {
    assert.equal(
      deriveVerificationLevel({
        name: "سالن ماه‌رخ",
        categoryId: 1,
        city: "کرمانشاه",
        province: "کرمانشاه",
        latitude: 34.32,
        longitude: 47.07,
      }),
      "basic",
    );
  });

  it("stays unverified without Iran coordinates", () => {
    assert.equal(
      deriveVerificationLevel({
        name: "Test",
        categoryId: 1,
        city: "تهران",
        province: "تهران",
        latitude: 51.5,
        longitude: -0.1,
      }),
      "unverified",
    );
  });

  it("never auto-mints contact/ownership/identity", () => {
    const derived = deriveVerificationLevel({
      name: "کافه نون",
      categoryId: 8,
      city: "کرمانشاه",
      province: "کرمانشاه",
      latitude: 34.32,
      longitude: 47.07,
    });
    assert.equal(derived, "basic");
    assert.equal(nextVerificationLevel("identity_verified", derived), "identity_verified");
    assert.equal(nextVerificationLevel("unverified", derived), "basic");
  });
});
