import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { foldFaKeepJoiner, normalizeFa } from "./normalize.ts";
import { parseSearchQuery } from "./parse-query.ts";

describe("NL parser", () => {
  it("maps a full Persian sentence to filters", () => {
    const p = parseSearchQuery("آرایشگاه در کرمانشاه که امروز باز است");
    assert.equal(p.mode, "parsed");
    assert.equal(p.categoryId, 1);
    assert.equal(p.categoryTerm, "آرایشگاه");
    assert.equal(p.city, "کرمانشاه");
    assert.equal(p.openNow, true);
    assert.equal(p.freeToday, false);
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
    assert.equal(c.freeToday, false);
    const n = parseSearchQuery("تاتو نزدیک من");
    assert.equal(n.categoryId, 1);
    assert.equal(n.nearMe, true);
  });

  it("treats availability phrases as freeToday, never as open-now", () => {
    const p = parseSearchQuery("تاتو نزدیک من که امروز وقت خالی دارد");
    assert.equal(p.openNow, false);
    assert.equal(p.freeToday, true);
    assert.equal(p.nearMe, true);
    assert.equal(p.categoryId, 1);
    assert.equal(p.remainder, "");
    const s = parseSearchQuery("آرایشگاه نوبت امروز");
    assert.equal(s.openNow, false);
    assert.equal(s.freeToday, true);
    const both = parseSearchQuery("کافه که الان باز است و امروز وقت خالی دارد");
    assert.equal(both.openNow, true);
    assert.equal(both.freeToday, true);
    assert.equal(both.categoryId, 8);
  });

  it("parses the production query تاتو در کرمانشاه که امروز وقت خالی دارد", () => {
    const p = parseSearchQuery("تاتو در کرمانشاه که امروز وقت خالی دارد");
    assert.equal(p.categoryId, 1);
    assert.equal(p.categoryTerm, "تاتو");
    assert.equal(p.city, "کرمانشاه");
    assert.equal(p.province, "کرمانشاه");
    assert.equal(p.openNow, false);
    assert.equal(p.freeToday, true);
    assert.equal(p.nearMe, false);
    assert.equal(p.remainder, "");
    assert.equal(p.remainder.includes("وقت"), false);
    assert.equal(p.mode, "parsed");
  });

  it("also eats وقت آزاد / نوبت دارد and never leaves them as remainder", () => {
    const a = parseSearchQuery("تاتو در کرمانشاه که امروز وقت آزاد دارد");
    assert.equal(a.freeToday, true);
    assert.equal(a.openNow, false);
    assert.equal(a.categoryTerm, "تاتو");
    assert.equal(a.city, "کرمانشاه");
    assert.equal(a.remainder, "");
    const n = parseSearchQuery("تاتو در کرمانشاه که امروز نوبت دارد");
    assert.equal(n.freeToday, true);
    assert.equal(n.categoryTerm, "تاتو");
    assert.equal(n.remainder, "");
  });

  it("does not invent today from a dateless وقت خالی دارد", () => {
    const p = parseSearchQuery("مکانیک در کرمانشاه وقت خالی دارد");
    assert.equal(p.categoryId, 4);
    assert.equal(p.categoryTerm, "مکانیک");
    assert.equal(p.city, "کرمانشاه");
    assert.equal(p.freeToday, false);
    assert.equal(p.openNow, false);
    assert.equal(p.remainder, "");
  });

  it("decomposes long natural Persian sentences without leaking WHEN into WHAT", () => {
    const rows: [string, { cat?: number; term?: string; city?: string; open?: boolean; free?: boolean; near?: boolean }][] = [
      ["تاتو در کرمانشاه که امروز وقت خالی دارد", { cat: 1, term: "تاتو", city: "کرمانشاه", open: false, free: true }],
      ["مکانیک در کرمانشاه که امروز وقت خالی دارد", { cat: 4, term: "مکانیک", city: "کرمانشاه", open: false, free: true }],
      ["مکانیک در کرمانشاه وقت خالی دارد", { cat: 4, term: "مکانیک", city: "کرمانشاه", open: false, free: false }],
      ["آرایشگاه زنانه کرمانشاه که الان باز است", { cat: 1, term: "آرایشگاه زنانه", city: "کرمانشاه", open: true, free: false }],
      ["کافه نزدیک من", { cat: 8, term: "کافه", near: true, open: false, free: false }],
      ["وکیل در کرمانشاه", { cat: 12, term: "وکیل", city: "کرمانشاه", open: false, free: false }],
    ];
    for (const [q, exp] of rows) {
      const p = parseSearchQuery(q);
      assert.equal(p.categoryId, exp.cat, q);
      assert.equal(p.categoryTerm, exp.term, q);
      if (exp.city) assert.equal(p.city, exp.city, q);
      assert.equal(p.openNow, exp.open ?? false, q);
      assert.equal(p.freeToday, exp.free ?? false, q);
      assert.equal(p.nearMe, exp.near ?? false, q);
      assert.equal(p.remainder, "", q);
      assert.equal(p.remainder.includes("وقت"), false, q);
    }
  });

  it("folds Android alef-maksura خالى onto خالی", () => {
    assert.equal(normalizeFa("وقت خالى دارد"), "وقت خالی دارد");
    const p = parseSearchQuery("تاتو در کرمانشاه که امروز وقت خالى دارد");
    assert.equal(p.freeToday, true);
    assert.equal(p.categoryTerm, "تاتو");
    assert.equal(p.remainder, "");
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
    assert.equal(p.freeToday, false);
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
    assert.equal(b.freeToday, false);
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
