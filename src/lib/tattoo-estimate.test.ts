import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calibrationFactor, estimateTattooPrice, sampleScore, type EstimateSample } from "./tattoo-estimate.ts";

const fine: EstimateSample = {
  id: "a",
  title: "کار ظریف",
  priceToman: 8_000_000,
  requestType: "new",
  placement: "ساعد",
  style: "خطوط ظریف",
  sizeCm: "کوچک",
  colorMode: "blackgrey",
  anchor: false,
};

const big: EstimateSample = {
  id: "b",
  title: "رئال بزرگ",
  priceToman: 40_000_000,
  requestType: "new",
  placement: "پشت",
  style: "رئالیسم سیاه و خاکستری",
  sizeCm: "خیلی بزرگ",
  colorMode: "blackgrey",
  anchor: false,
};

describe("tattoo estimate", () => {
  it("ignores zero prices", () => {
    const estimate = estimateTattooPrice(
      { requestType: "new", placement: "ساعد", style: "خطوط ظریف", sizeCm: "کوچک", colorMode: "blackgrey", idea: "یک خط نازک", imageCount: 1 },
      [{ ...fine, priceToman: 0 }, { ...big, priceToman: 0 }],
    );
    assert.equal(estimate.minToman, null);
    assert.equal(estimate.validSamples, 0);
  });

  it("prefers a similar small fine-line job over a large realism", () => {
    const draft = { requestType: "new", placement: "ساعد راست", style: "خطوط ظریف", sizeCm: "کوچک", colorMode: "blackgrey", idea: "نوشته کوتاه", imageCount: 1 };
    assert.ok(sampleScore(draft, fine) > sampleScore(draft, big));
    const estimate = estimateTattooPrice(draft, [fine, big]);
    assert.equal(estimate.similar[0]?.id, "a");
    assert.ok((estimate.maxToman || 0) < 20_000_000);
  });

  it("does not price a large piece from small cheap jobs", () => {
    const estimate = estimateTattooPrice(
      { requestType: "new", placement: "پشت", style: "رئالیسم", sizeCm: "خیلی بزرگ", colorMode: "blackgrey", idea: "پرتره تمام پشت", imageCount: 3 },
      [fine, { ...fine, id: "c", priceToman: 5_000_000 }],
    );
    assert.equal(estimate.minToman, null);
    assert.equal(estimate.maxToman, null);
  });

  it("stays near a same-size expensive job", () => {
    const estimate = estimateTattooPrice(
      { requestType: "new", placement: "پشت", style: "رئالیسم", sizeCm: "خیلی بزرگ", colorMode: "blackgrey", idea: "پرتره", imageCount: 2 },
      [fine, big, { ...big, id: "d", priceToman: 32_000_000, title: "پشت دوم" }],
    );
    assert.ok((estimate.minToman || 0) >= 20_000_000);
  });

  it("learns only from positive final prices", () => {
    assert.equal(calibrationFactor([0, 0]), 1);
    assert.ok(calibrationFactor([1.4, 1.5, 1.6]) > 1.3);
  });
});
