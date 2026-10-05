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
  it("counts patterns without naming anyone", () => {
    const out = summarizeCustomerFiles([
      sample({ skinTone: "روشن", inkHold: "خوب رنگ می‌گیرد", toleranceHours: "۴ ساعت", bloodType: "O+" }),
      sample({ skinTone: "روشن", inkHold: "خوب رنگ می‌گیرد", toleranceHours: "۶ ساعت", bloodType: "A+" }),
      sample({ skinTone: "تیره", inkHold: "سخت رنگ می‌گیرد", toleranceHours: "۲ ساعت", alcohol: "قبل از جلسه خورده بود" }),
      sample({}),
    ]);
    assert.equal(out.files, 4);
    assert.equal(out.filled, 3);
    assert.equal(out.groups.find((group) => group.title === "رنگ پوست")?.rows[0].label, "روشن");
    assert.equal(out.groups.find((group) => group.title === "رنگ پوست")?.rows[0].count, 2);
    assert.equal(out.averageToleranceHours, 4);
    assert.match(out.lines.join("\n"), /بیشتر «روشن»/);
    assert.equal(JSON.stringify(out).includes("مشتری"), false);
  });
});
