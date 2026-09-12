import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { foldFaKeepJoiner } from "./normalize.ts";
import { parseSearchQuery } from "./parse-query.ts";

describe("NL parser", () => {
  it("maps a full Persian sentence to filters", () => {
    const p = parseSearchQuery("آرایشگاه در کرمانشاه که امروز باز است");
    assert.equal(p.mode, "parsed");
    assert.equal(p.categoryId, 1);
    assert.equal(p.categoryTerm, "آرایشگاه");
    assert.equal(p.city, "کرمانشاه");
    assert.equal(p.openNow, true);
    assert.equal(p.remainder.includes("است"), false);
    assert.equal(p.confidence, "high");
  });

  it("parses tattoo and cafe near-me queries", () => {
    const t = parseSearchQuery("تاتو در کرمانشاه");
    assert.equal(t.categoryId, 1);
    assert.equal(t.categoryTerm, "تاتو");
    assert.equal(t.city, "کرمانشاه");
    const c = parseSearchQuery("کافه نزدیک من که الان بازه");
    assert.equal(c.categoryId, 8);
    assert.equal(c.nearMe, true);
    assert.equal(c.openNow, true);
    const n = parseSearchQuery("تاتو نزدیک من");
    assert.equal(n.categoryId, 1);
    assert.equal(n.nearMe, true);
  });

  it("does not treat booking-availability phrases as open-now", () => {
    const p = parseSearchQuery("تاتو نزدیک من که امروز وقت خالی دارد");
    assert.equal(p.openNow, false);
    assert.equal(p.nearMe, true);
    assert.equal(p.categoryId, 1);
    const s = parseSearchQuery("آرایشگاه نوبت امروز");
    assert.equal(s.openNow, false);
  });

  it("normalizes Arabic yeh/kaf and Persian digits", () => {
    const p = parseSearchQuery("آرايشگاه در كرمانشاه");
    assert.equal(p.categoryId, 1);
    assert.equal(p.city, "کرمانشاه");
  });

  it("falls back to classic remainder when nothing structured matches", () => {
    const p = parseSearchQuery("ماه‌رخ");
    assert.equal(p.mode, "fallback");
    assert.equal(p.original, "ماه‌رخ");
    assert.equal(foldFaKeepJoiner(p.original), p.original);
  });

  it("keeps the original query even after extracting filters", () => {
    const p = parseSearchQuery("آرایشگاه زنانه کرمانشاه");
    assert.equal(p.original, "آرایشگاه زنانه کرمانشاه");
    assert.equal(p.categoryId, 1);
    assert.equal(p.city, "کرمانشاه");
  });

  it("does not treat بازار as open-now or ری inside شیرینی as a city", () => {
    const b = parseSearchQuery("بازار کرمانشاه");
    assert.equal(b.openNow, false);
    assert.equal(b.city, "کرمانشاه");
    const s = parseSearchQuery("شیرینی");
    assert.equal(s.categoryId, 8);
    assert.notEqual(s.city, "ری");
  });

  it("does not collapse کرمانشاه into کرمان", () => {
    const p = parseSearchQuery("تاتو کرمانشاه");
    assert.equal(p.city, "کرمانشاه");
    assert.equal(p.province, "کرمانشاه");
    const k = parseSearchQuery("تاتو کرمان");
    assert.equal(k.city, "کرمان");
    assert.equal(k.province, "کرمان");
  });
});
