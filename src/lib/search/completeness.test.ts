import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMPLETENESS_WEIGHTS, profileCompleteness } from "./completeness.ts";

describe("profile completeness", () => {
  it("weights sum to 100", () => {
    const sum = Object.values(COMPLETENESS_WEIGHTS).reduce((a, b) => a + b, 0);
    assert.equal(sum, 100);
  });

  it("empty listing scores 0 and lists every component", () => {
    const r = profileCompleteness({});
    assert.equal(r.score, 0);
    assert.deepEqual(r.missing, Object.keys(COMPLETENESS_WEIGHTS));
  });

  it("is deterministic and returns missing keys", () => {
    const input = {
      name: "آتلیه نقش",
      categoryId: 1,
      phone: "09126812852",
      city: "کرمانشاه",
      province: "کرمانشاه",
      address: "میدان مرکزی",
      latitude: 34.32,
      longitude: 47.07,
      description: "طراحی اختصاصی تاتو با بهداشت استریل.",
      prices: [{ title: "جلسه تاتو", price: 1 }],
      workHours: [{ day: "شنبه", open: "10:00", close: "18:00", closed: false }],
    };
    const a = profileCompleteness(input);
    const b = profileCompleteness(input);
    assert.equal(a.score, 100);
    assert.equal(b.score, 100);
    assert.deepEqual(a.missing, []);
  });

  it("does not hide a sparse profile — score is a signal only", () => {
    const r = profileCompleteness({ name: "الف", categoryId: 1 });
    assert.ok(r.score < 50);
    assert.ok(r.missing.includes("phone"));
    assert.ok(r.score > 0);
  });
});
