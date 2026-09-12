import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSearchQuery } from "./parse-query.ts";
import { expandSearchTerms, filterRelevant, scoreListing, traceMatch } from "./simple-search.ts";

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
  jobTitle: "تاتو و طراحی بدن",
  categoryName: "آرایش و زیبایی",
  description: "طرح اختصاصی",
  prices: [{ title: "مشاوره طرح" }],
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
  jobTitle: "مکانیک و برق خودرو",
  categoryName: "خودرو و تعمیرات",
  prices: [{ title: "تعویض روغن" }],
};
const lawyer = {
  name: "دفتر حقوقی پارس",
  jobTitle: "وکیل",
  categoryName: "حقوقی و مالی",
  prices: [{ title: "مشاوره" }],
};
const smoke = {
  name: "تست اسموک",
  jobTitle: null as string | null,
  categoryName: "آرایش و زیبایی",
  description: null as string | null,
  prices: [{ title: "خدمت تست" }],
};
const tattooBody = {
  name: "تاتو بدن",
  jobTitle: "تاتو بدن",
  categoryName: "آرایش و زیبایی",
  prices: [{ title: "تاتو بدن" }],
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
    assert.deepEqual(filterRelevant(all, "برق خودرو").map((r) => r.name), [mechanic.name]);
    assert.deepEqual(filterRelevant(all, "وکیل").map((r) => r.name), [lawyer.name]);
    assert.deepEqual(filterRelevant(all, "کافه").map((r) => r.name), [cafe.name]);
  });

  it("returns zero rows when nothing relevant matches", () => {
    const all = [cafe, doctor, tattoo, salon, mechanic, lawyer, smoke];
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

  it("excludes a same-category listing whose name/job/service is unrelated (production smoke false-positive)", () => {
    const A = { name: "استودیو", jobTitle: "تاتو بدن", categoryName: "آرایش و زیبایی", prices: [{ title: "مشاوره" }] };
    const B = { name: "سالن تست", jobTitle: "خدمت تست", categoryName: "آرایش و زیبایی", prices: [{ title: "خدمت تست" }] };
    for (const q of ["تاتو", "تتو", "tattoo", "Tattoo"]) {
      const names = filterRelevant([A, B, smoke], q).map((r) => r.name);
      assert.deepEqual(names, [A.name], q);
      const smokeTrace = traceMatch(smoke, q);
      assert.equal(smokeTrace.name, false, q);
      assert.equal(smokeTrace.jobTitle, false, q);
      assert.equal(smokeTrace.service, false, q);
      assert.equal(smokeTrace.kept, false, q);
    }
  });

  it("treats تتو / تاتو / tattoo as one concept on name/job/service", () => {
    const termsTatoo = expandSearchTerms("تتو");
    assert.equal(termsTatoo.includes("تاتو"), true);
    assert.equal(termsTatoo.includes("tattoo"), true);
    const rows = [tattoo, tattooBody, smoke, salon];
    assert.deepEqual(filterRelevant(rows, "تاتو").map((r) => r.name).sort(), [tattoo.name, tattooBody.name].sort());
    assert.deepEqual(filterRelevant(rows, "تتو").map((r) => r.name).sort(), [tattoo.name, tattooBody.name].sort());
    assert.deepEqual(filterRelevant(rows, "tattoo").map((r) => r.name).sort(), [tattoo.name, tattooBody.name].sort());
    assert.equal(traceMatch(tattoo, "تتو").jobTitle, true);
    assert.equal(traceMatch(smoke, "تتو").kept, false);
  });

  it("matches one coherent listing per category without leaking into other categories", () => {
    const samples = [
      { name: "سالن آرایش گل‌رخ", jobTitle: "آرایشگاه زنانه", categoryName: "آرایش و زیبایی", prices: [{ title: "اصلاح و براشینگ" }] },
      { name: "مطب دکتر رستمی", jobTitle: "پزشک عمومی", categoryName: "پزشکی و سلامت", prices: [{ title: "ویزیت پزشک" }] },
      { name: "استودیو نرم‌افزار کارا", jobTitle: "طراحی سایت", categoryName: "فناوری و طراحی", prices: [{ title: "طراحی سایت" }] },
      { name: "مکانیک سپهر", jobTitle: "مکانیک خودرو", categoryName: "خودرو و تعمیرات", prices: [{ title: "برق خودرو" }] },
      { name: "فروشگاه خانه‌نو", jobTitle: "فروشگاه لوازم خانه", categoryName: "فروشگاه و خرید", prices: [{ title: "خرید کالا" }] },
      { name: "نظافت پاک‌خانه", jobTitle: "نظافت منزل", categoryName: "خدمات خانه", prices: [{ title: "نظافت منزل" }] },
      { name: "رستوران چلوکباب نیاوران", jobTitle: "غذا و کباب", categoryName: "غذا و رستوران", prices: [{ title: "چلوکباب" }] },
      { name: "کافه قهوه دان", jobTitle: "کافی‌شاپ", categoryName: "کافه و شیرینی", prices: [{ title: "قهوه اسپرسو" }] },
      { name: "آموزشگاه زبان نور", jobTitle: "آموزش زبان", categoryName: "آموزش", prices: [{ title: "کلاس خصوصی" }] },
      { name: "باشگاه تناسب یاران", jobTitle: "ورزش و بدنسازی", categoryName: "ورزش و تندرستی", prices: [{ title: "جلسه تمرین" }] },
      { name: "املاک طاق‌بستان", jobTitle: "مشاور املاک", categoryName: "املاک و ساختمان", prices: [{ title: "بازدید ملک" }] },
      { name: "دفتر وکالت دادگر", jobTitle: "وکیل پایه یک", categoryName: "حقوقی و مالی", prices: [{ title: "مشاوره حقوقی" }] },
    ];
    const cases: [string, string][] = [
      ["آرایشگاه", "سالن آرایش گل‌رخ"],
      ["پزشک", "مطب دکتر رستمی"],
      ["دکتر", "مطب دکتر رستمی"],
      ["طراحی سایت", "استودیو نرم‌افزار کارا"],
      ["مکانیک", "مکانیک سپهر"],
      ["فروشگاه", "فروشگاه خانه‌نو"],
      ["نظافت", "نظافت پاک‌خانه"],
      ["رستوران", "رستوران چلوکباب نیاوران"],
      ["کافه", "کافه قهوه دان"],
      ["آموزش", "آموزشگاه زبان نور"],
      ["باشگاه", "باشگاه تناسب یاران"],
      ["املاک", "املاک طاق‌بستان"],
      ["وکیل", "دفتر وکالت دادگر"],
    ];
    for (const [q, expected] of cases) {
      const names = filterRelevant(samples, q).map((r) => r.name);
      assert.equal(names.includes(expected), true, q);
      assert.equal(names.includes("تست اسموک"), false, q);
    }
  });
});
