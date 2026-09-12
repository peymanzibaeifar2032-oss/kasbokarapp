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
    assert.equal(t("zeroResults"), "کسب‌وکاری با این جست‌وجو پیدا نشد.");
    assert.equal(t("completePhone"), "شماره تماس");
    assert.equal(t("zeroHintGeneric"), "فیلترها را کمتر کنید یا عبارت دیگری بنویسید");
    assert.equal(t("searchPlaceholder"), "چی می‌خوای؟ مثلاً تاتو در کرمانشاه که الان باز است");
    assert.equal(t("intentWhen"), "کی");
    assert.equal(t("intentOpenNow"), "الان باز است");
    assert.equal(t("intentFreeToday"), "وقت آزاد امروز");
    assert.equal(t("nearMeUse"), "استفاده از موقعیت");
    assert.equal(t("blockInterval"), "بستن بازه");
  });

  it("english catalog falls back to Persian until translations exist", () => {
    assert.equal(t("appName", "en"), "کسب‌وکار");
  });
});
