import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultDir, defaultLocale, dirFor, t } from "./index.ts";

describe("i18n foundation", () => {
  it("defaults to fa-IR RTL", () => {
    assert.equal(defaultLocale, "fa-IR");
    assert.equal(defaultDir, "rtl");
    assert.equal(dirFor("fa-IR"), "rtl");
    assert.equal(dirFor("en"), "ltr");
  });

  it("keeps current Persian UI copy", () => {
    assert.equal(t("navMap"), "نقشه");
    assert.equal(t("booking"), "رزرو");
    assert.equal(t("favorites"), "ذخیره‌شده‌ها");
    assert.doesNotMatch(t("waitlist"), /waitlist/i);
  });

  it("english catalog falls back to Persian until translations exist", () => {
    assert.equal(t("appName", "en"), "کسب‌وکار");
  });
});
