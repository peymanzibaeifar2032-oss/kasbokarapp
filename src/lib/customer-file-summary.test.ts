import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeCustomerFiles, type FileSample } from "./customer-file-summary.ts";

function sample(patch: Partial<FileSample>): FileSample {
  return {
    skinTone: "",
    inkHold: "",
    fade: "",
    alcohol: "",
    arrival: "",
    pain: "",
    healing: "",
    numbing: "",
    bleeding: "",
    bloodType: "",
    toleranceHours: "",
    hydration: "",
    sensitivity: "",
    notes: "",
    hasHealedImage: false,
    ...patch,
  };
}

describe("customer file summary", () => {
  it("compares skin and blood with pain instead of listing raw counts", () => {
    const out = summarizeCustomerFiles([
      sample({ skinTone: "روشن", pain: "درد را راحت تحمل می‌کند", toleranceHours: "۶ ساعت", inkHold: "خوب رنگ می‌گیرد", bloodType: "O+" }),
      sample({ skinTone: "روشن", pain: "درد را راحت تحمل می‌کند", toleranceHours: "۵ ساعت", inkHold: "خوب رنگ می‌گیرد", bloodType: "O+" }),
      sample({ skinTone: "گندمی", pain: "زود خسته می‌شود", toleranceHours: "۲ ساعت", inkHold: "سخت رنگ می‌گیرد", bloodType: "A+" }),
      sample({ skinTone: "گندمی", pain: "زود خسته می‌شود", toleranceHours: "۳ ساعت", inkHold: "سخت رنگ می‌گیرد", bloodType: "A+" }),
    ]);
    const skin = out.relations.find((item) => item.title === "پوست و درد");
    const blood = out.relations.find((item) => item.title === "گروه خونی و درد");
    const ink = out.relations.find((item) => item.title === "پوست و نشستن رنگ");
    assert.ok(skin);
    assert.match(skin.finding, /پوست روشن \(سفید\)/);
    assert.match(skin.finding, /پوست گندمی \(سبزه\)/);
    assert.match(skin.finding, /بیشتر کشیده/);
    assert.ok(blood);
    assert.match(blood.finding, /گروه O\+/);
    assert.ok(ink);
    assert.match(ink.finding, /سخت رنگ گرفته/);
    assert.equal(out.relations.some((item) => item.finding.includes("از ۷")), false);
  });
});
