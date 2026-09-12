import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyHomeSearchEligibility,
  resolveExplicitCategoryId,
  traceHomeSearch,
} from "./home-search.ts";

const naghsh = {
  id: "biz-naghsh",
  name: "آتلیه نقش",
  jobTitle: "تاتو و طراحی بدن",
  categoryId: 1,
  categoryName: "آرایش و زیبایی",
  prices: [{ title: "مشاوره طرح" }, { title: "جلسه تاتو" }],
};
const golrokh = {
  id: "biz-ks-01-beauty",
  name: "سالن آرایش گل‌رخ",
  jobTitle: "آرایشگاه زنانه",
  categoryId: 1,
  categoryName: "آرایش و زیبایی",
  prices: [{ title: "اصلاح و براشینگ" }, { title: "رنگ مو" }],
};
const smoke = {
  id: "smoke",
  name: "تست اسموک",
  jobTitle: null as string | null,
  categoryId: 1,
  categoryName: "آرایش و زیبایی",
  prices: [{ title: "خدمت تست" }],
};
const cafe = {
  id: "biz-noon",
  name: "کافه نون و نمک",
  jobTitle: "کافه و نان تازه",
  categoryId: 8,
  categoryName: "کافه و شیرینی",
  prices: [{ title: "میز دو نفره" }],
};

const all = [naghsh, golrokh, smoke, cafe];

describe("home search server eligibility", () => {
  it("ignores inferred categoryId unless explicitCategory is true", () => {
    assert.equal(resolveExplicitCategoryId({ q: "تاتو", categoryId: 1 }), undefined);
    assert.equal(resolveExplicitCategoryId({ q: "تاتو", categoryId: 1, explicitCategory: false }), undefined);
    assert.equal(resolveExplicitCategoryId({ q: "تاتو", categoryId: 1, explicitCategory: true }), 1);
  });

  it("q=تاتو keeps tattoo jobs and excludes same-category salon and smoke", () => {
    for (const q of ["تاتو", "تتو", "tattoo"]) {
      const kept = applyHomeSearchEligibility(all, { q, categoryId: 1 });
      assert.deepEqual(kept.map((r) => r.id), [naghsh.id], q);
      const tr = traceHomeSearch(all, { q, categoryId: 1 });
      const gol = tr.traces.find((x) => x.id === golrokh.id)!;
      assert.equal(gol.name_match, false, q);
      assert.equal(gol.job_match, false, q);
      assert.equal(gol.service_match, false, q);
      assert.equal(gol.server_kept, false, q);
      const sm = tr.traces.find((x) => x.id === smoke.id)!;
      assert.equal(sm.server_kept, false, q);
    }
  });

  it("empty q + explicit beauty browse keeps all visible beauty rows", () => {
    const kept = applyHomeSearchEligibility(all, { q: "", categoryId: 1, explicitCategory: true });
    assert.deepEqual(kept.map((r) => r.id).sort(), [naghsh.id, golrokh.id, smoke.id].sort());
  });

  it("explicit beauty + q=تاتو is intersection, not category dump", () => {
    const kept = applyHomeSearchEligibility(all, { q: "تاتو", categoryId: 1, explicitCategory: true });
    assert.deepEqual(kept.map((r) => r.id), [naghsh.id]);
  });

  it("old-client payload with inferred categoryId still does not dump beauty", () => {
    const kept = applyHomeSearchEligibility(all, { q: "تاتو", categoryId: 1, explicitCategory: undefined });
    assert.deepEqual(kept.map((r) => r.id), [naghsh.id]);
  });
});
