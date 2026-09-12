import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expandSearchTerms, filterRelevant, scoreListing } from "./simple-search.ts";

const cafe = {
  name: "کافه نون و نمک",
  jobTitle: null,
  categoryName: "کافه و شیرینی",
  description: "صبحانه و قهوه",
  prices: [{ title: "لاته" }],
};
const doctor = {
  name: "کلینیک نور",
  jobTitle: "پزشک عمومی",
  categoryName: "پزشکی و سلامت",
  description: "ویزیت",
  prices: [{ title: "ویزیت پزشک" }],
};
const tattoo = {
  name: "آتلیه نقش",
  jobTitle: "تاتو",
  categoryName: "آرایش و زیبایی",
  description: "طرح اختصاصی",
  prices: [{ title: "تاتو ظریف" }],
};
const salon = {
  name: "سالن ماه‌رخ",
  jobTitle: "آرایشگر",
  categoryName: "آرایش و زیبایی",
  description: "رنگ و کوتاهی",
  prices: [{ title: "اصلاح" }],
};
const mechanic = {
  name: "تعمیرگاه راه‌نو",
  jobTitle: "مکانیک",
  categoryName: "خودرو و تعمیرات",
  prices: [{ title: "تعویض روغن" }],
};
const lawyer = {
  name: "دفتر حقوقی پارس",
  jobTitle: "وکیل",
  categoryName: "حقوقی و مالی",
  prices: [{ title: "مشاوره" }],
};

describe("simple search relevance", () => {
  it("expands occupation synonyms without becoming a category id", () => {
    const terms = expandSearchTerms("دکتر");
    assert.equal(terms.includes("دکتر"), true);
    assert.equal(terms.includes("پزشک"), true);
  });

  it("does not keep a cafe when the query is پزشک or دکتر", () => {
    assert.equal(scoreListing(cafe, "پزشک") < 70, true);
    assert.equal(filterRelevant([cafe, doctor], "پزشک").map((r) => r.name).join(), doctor.name);
    assert.equal(filterRelevant([cafe, doctor], "دکتر").map((r) => r.name).join(), doctor.name);
  });

  it("keeps tattoo via job/service, not the whole beauty category", () => {
    const rows = filterRelevant([tattoo, salon, cafe], "تاتو");
    assert.deepEqual(rows.map((r) => r.name), [tattoo.name]);
  });

  it("keeps mechanic / lawyer / cafe by text, not unrelated listings", () => {
    const all = [cafe, doctor, tattoo, salon, mechanic, lawyer];
    assert.deepEqual(filterRelevant(all, "مکانیک").map((r) => r.name), [mechanic.name]);
    assert.deepEqual(filterRelevant(all, "وکیل").map((r) => r.name), [lawyer.name]);
    assert.deepEqual(filterRelevant(all, "کافه").map((r) => r.name), [cafe.name]);
  });

  it("returns zero rows when nothing relevant matches", () => {
    const all = [cafe, doctor, tattoo, salon, mechanic, lawyer];
    assert.equal(filterRelevant(all, "xyzzy_no_match").length, 0);
  });

  it("browse mode with empty query keeps every listing", () => {
    const all = [cafe, doctor];
    assert.equal(filterRelevant(all, "").length, 2);
    assert.equal(filterRelevant(all, "   ").length, 2);
  });

  it("does not treat category name پزشکی as a match for پزشک alone", () => {
    const onlyCategory = {
      name: "آزمایشگاه سپهر",
      jobTitle: "نمونه‌گیری",
      categoryName: "پزشکی و سلامت",
      description: "آزمایش خون",
      prices: [{ title: "CBC" }],
    };
    assert.equal(filterRelevant([onlyCategory], "پزشک").length, 0);
    assert.equal(filterRelevant([onlyCategory], "دکتر").length, 0);
  });
});
