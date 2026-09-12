import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applySearchIntent } from "./apply-intent.ts";
import { parseSearchQuery } from "./parse-query.ts";

const TEHRAN = { lat: 35.69, lng: 51.39 };

describe("applySearchIntent", () => {
  it("maps tattoo in Kermanshah to what+where and hides when", () => {
    const intent = applySearchIntent({
      parsed: parseSearchQuery("تاتو در کرمانشاه"),
      defaultCity: "تهران",
      defaultProvince: "تهران",
    });
    assert.equal(intent.city, "کرمانشاه");
    assert.equal(intent.province, "کرمانشاه");
    assert.equal(intent.categoryId, 1);
    assert.equal(intent.openNow, false);
    assert.equal(intent.freeToday, false);
    assert.equal(intent.needsLocation, false);
    assert.deepEqual(
      intent.chips.map((c) => c.key),
      ["what", "where"],
    );
    assert.equal(intent.chips.find((c) => c.key === "what")?.value, "تاتو");
    assert.equal(intent.chips.find((c) => c.key === "where")?.value, "کرمانشاه");
    assert.equal(intent.chips.some((c) => c.key === "when"), false);
  });

  it("shows when for open-now and separately for free-today", () => {
    const open = applySearchIntent({
      parsed: parseSearchQuery("آرایشگاه در کرمانشاه که الان باز است"),
      defaultCity: "کرمانشاه",
      defaultProvince: "کرمانشاه",
    });
    assert.equal(open.openNow, true);
    assert.equal(open.freeToday, false);
    assert.equal(open.chips.find((c) => c.value === "openNow")?.key, "when");
    assert.equal(open.chips.some((c) => c.value === "freeToday"), false);
    assert.equal(open.city, "کرمانشاه");

    const slot = applySearchIntent({
      parsed: parseSearchQuery("تاتو نزدیک من که امروز وقت خالی دارد"),
      defaultCity: "کرمانشاه",
      defaultProvince: "کرمانشاه",
    });
    assert.equal(slot.openNow, false);
    assert.equal(slot.freeToday, true);
    assert.equal(slot.chips.find((c) => c.key === "when")?.value, "freeToday");
    assert.equal(slot.chips.find((c) => c.key === "what")?.value, "تاتو");
    assert.equal(slot.needsLocation, true);
  });

  it("maps the production query to تاتو / کرمانشاه / وقت آزاد امروز", () => {
    const intent = applySearchIntent({
      parsed: parseSearchQuery("تاتو در کرمانشاه که امروز وقت خالی دارد"),
      defaultCity: "تهران",
      defaultProvince: "تهران",
    });
    assert.equal(intent.categoryId, 1);
    assert.equal(intent.city, "کرمانشاه");
    assert.equal(intent.openNow, false);
    assert.equal(intent.freeToday, true);
    assert.deepEqual(
      intent.chips.map((c) => `${c.key}:${c.value}`),
      ["what:تاتو", "where:کرمانشاه", "when:freeToday"],
    );
    assert.equal(intent.chips.some((c) => c.value.includes("وقت")), false);
  });

  it("never lets leftover availability become WHAT when a category is known", () => {
    const dirty = parseSearchQuery("مکانیک در کرمانشاه");
    dirty.remainder = "وقت خالی دارد";
    const intent = applySearchIntent({
      parsed: dirty,
      defaultCity: "کرمانشاه",
      defaultProvince: "کرمانشاه",
    });
    assert.equal(intent.chips.find((c) => c.key === "what")?.value, "مکانیک");
    assert.equal(intent.chips.some((c) => String(c.value).includes("وقت")), false);
  });

  it("recovers WHAT/WHEN from original text even if freeToday was not parsed", () => {
    const stale = parseSearchQuery("مکانیک در کرمانشاه");
    stale.original = "مکانیک در کرمانشاه که امروز وقت خالی دارد";
    stale.remainder = "وقت خالی دارد";
    stale.categoryTerm = "مکانیک";
    stale.categoryId = 4;
    stale.city = "کرمانشاه";
    stale.freeToday = false;
    stale.openNow = false;
    const intent = applySearchIntent({
      parsed: stale,
      defaultCity: "کرمانشاه",
      defaultProvince: "کرمانشاه",
    });
    assert.equal(intent.chips.find((c) => c.key === "what")?.value, "مکانیک");
    assert.equal(intent.chips.find((c) => c.key === "when")?.value, "freeToday");
    assert.equal(intent.freeToday, true);
    assert.equal(intent.openNow, false);
  });

  it("decomposes the production examples into independent چی/کجا/کی chips", () => {
    const kermanshah = { defaultCity: "کرمانشاه", defaultProvince: "کرمانشاه" };
    const tattoo = applySearchIntent({
      parsed: parseSearchQuery("تاتو در کرمانشاه که امروز وقت خالی دارد"),
      ...kermanshah,
    });
    assert.deepEqual(
      tattoo.chips.map((c) => `${c.key}:${c.value}`),
      ["what:تاتو", "where:کرمانشاه", "when:freeToday"],
    );

    const mechanic = applySearchIntent({
      parsed: parseSearchQuery("مکانیک در کرمانشاه که امروز وقت خالی دارد"),
      ...kermanshah,
    });
    assert.equal(mechanic.chips.find((c) => c.key === "what")?.value, "مکانیک");
    assert.equal(mechanic.chips.find((c) => c.key === "where")?.value, "کرمانشاه");
    assert.equal(mechanic.chips.find((c) => c.key === "when")?.value, "freeToday");
    assert.equal(mechanic.freeToday, true);
    assert.equal(mechanic.openNow, false);

    const dateless = applySearchIntent({
      parsed: parseSearchQuery("مکانیک در کرمانشاه وقت خالی دارد"),
      ...kermanshah,
    });
    assert.equal(dateless.chips.find((c) => c.key === "what")?.value, "مکانیک");
    assert.equal(dateless.freeToday, false);
    assert.equal(dateless.chips.some((c) => c.key === "when"), false);
    assert.equal(dateless.chips.some((c) => String(c.value).includes("وقت")), false);

    const salon = applySearchIntent({
      parsed: parseSearchQuery("آرایشگاه زنانه کرمانشاه که الان باز است"),
      ...kermanshah,
    });
    assert.equal(salon.chips.find((c) => c.key === "what")?.value, "آرایشگاه زنانه");
    assert.equal(salon.chips.find((c) => c.key === "where")?.value, "کرمانشاه");
    assert.equal(salon.chips.find((c) => c.key === "when")?.value, "openNow");
    assert.equal(salon.freeToday, false);

    const cafe = applySearchIntent({
      parsed: parseSearchQuery("کافه نزدیک من"),
      ...kermanshah,
    });
    assert.equal(cafe.chips.find((c) => c.key === "what")?.value, "کافه");
    assert.equal(cafe.needsLocation, true);
    assert.equal(cafe.chips.some((c) => c.key === "when"), false);

    const lawyer = applySearchIntent({
      parsed: parseSearchQuery("وکیل در کرمانشاه"),
      ...kermanshah,
    });
    assert.deepEqual(
      lawyer.chips.map((c) => `${c.key}:${c.value}`),
      ["what:وکیل", "where:کرمانشاه"],
    );
  });

  it("does not claim near-me until an origin exists", () => {
    const waiting = applySearchIntent({
      parsed: parseSearchQuery("کافه نزدیک من"),
      defaultCity: "کرمانشاه",
      defaultProvince: "کرمانشاه",
    });
    assert.equal(waiting.needsLocation, true);
    assert.equal(waiting.sortDistance, false);
    assert.equal(waiting.omitDefaultPlace, false);
    assert.equal(waiting.city, "کرمانشاه");
    assert.equal(waiting.chips.some((c) => c.value === "nearMe"), false);
    assert.equal(waiting.chips.some((c) => c.key === "where"), false);

    const pinned = applySearchIntent({
      parsed: parseSearchQuery("کافه نزدیک من"),
      defaultCity: "کرمانشاه",
      defaultProvince: "کرمانشاه",
      origin: TEHRAN,
    });
    assert.equal(pinned.needsLocation, false);
    assert.equal(pinned.sortDistance, true);
    assert.equal(pinned.omitDefaultPlace, true);
    assert.equal(pinned.city, null);
    assert.equal(pinned.province, null);
    assert.equal(pinned.chips.find((c) => c.key === "where")?.value, "nearMe");
  });

  it("falls back to the selected city after the user declines GPS", () => {
    const intent = applySearchIntent({
      parsed: parseSearchQuery("کافه نزدیک من"),
      defaultCity: "شیراز",
      defaultProvince: "فارس",
      cityFallback: true,
    });
    assert.equal(intent.needsLocation, false);
    assert.equal(intent.omitDefaultPlace, false);
    assert.equal(intent.city, "شیراز");
    assert.equal(intent.chips.some((c) => c.value === "nearMe"), false);
  });

  it("emits no chips for an empty query", () => {
    const intent = applySearchIntent({
      parsed: parseSearchQuery(""),
      defaultCity: "کرمانشاه",
      defaultProvince: "کرمانشاه",
    });
    assert.deepEqual(intent.chips, []);
    assert.equal(intent.needsLocation, false);
    assert.equal(intent.openNow, false);
    assert.equal(intent.freeToday, false);
  });
});
