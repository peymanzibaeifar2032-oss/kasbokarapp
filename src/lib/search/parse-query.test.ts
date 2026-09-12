import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSearchQuery } from "./parse-query.ts";

describe("NL parser", () => {
  it("maps a full Persian sentence to filters", () => {
    const p = parseSearchQuery("آرایشگاه در کرمانشاه که امروز باز است");
    assert.equal(p.mode, "parsed");
    assert.equal(p.categoryId, 1);
    assert.equal(p.city, "کرمانشاه");
    assert.equal(p.openNow, true);
    assert.equal(p.confidence, "high");
  });

  it("parses tattoo and cafe near-me queries", () => {
    const t = parseSearchQuery("تاتو در کرمانشاه");
    assert.equal(t.categoryId, 1);
    assert.equal(t.city, "کرمانشاه");
    const c = parseSearchQuery("کافه نزدیک من که الان بازه");
    assert.equal(c.categoryId, 8);
    assert.equal(c.nearMe, true);
    assert.equal(c.openNow, true);
    const n = parseSearchQuery("تاتو نزدیک من");
    assert.equal(n.categoryId, 1);
    assert.equal(n.nearMe, true);
  });

  it("normalizes Arabic yeh/kaf and Persian digits", () => {
    const p = parseSearchQuery("آرايشگاه در كرمانشاه");
    assert.equal(p.categoryId, 1);
    assert.equal(p.city, "کرمانشاه");
  });

  it("falls back to classic remainder when nothing structured matches", () => {
    const p = parseSearchQuery("ماه‌رخ");
    assert.equal(p.mode, "fallback");
    assert.equal(p.remainder.includes("ماه"), true);
    assert.equal(p.original, "ماه‌رخ");
  });

  it("keeps the original query even after extracting filters", () => {
    const p = parseSearchQuery("آرایشگاه زنانه کرمانشاه");
    assert.equal(p.original, "آرایشگاه زنانه کرمانشاه");
    assert.equal(p.categoryId, 1);
    assert.equal(p.city, "کرمانشاه");
  });
});
