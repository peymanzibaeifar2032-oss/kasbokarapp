import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeText, tilePlan } from "./process.ts";

describe("tattoo prep helpers", () => {
  it("escapes html characters", () => {
    assert.equal(escapeText('<b class="x">&\'</b>'), "&lt;b class=&quot;x&quot;&gt;&amp;&#39;&lt;/b&gt;");
  });

  it("splits a wide design across A4 sheets", () => {
    const plan = tilePlan(400, 150, "a4");
    assert.equal(plan.cols, 3);
    assert.equal(plan.rows, 1);
    assert.equal(plan.pages, 3);
    assert.equal(plan.sheet.label, "A4");
  });

  it("keeps a small design on one sheet", () => {
    const plan = tilePlan(100, 150, "letter");
    assert.equal(plan.pages, 1);
  });
});
