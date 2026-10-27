import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prepPrompt } from "./prompts.ts";
import { escapeText, sheetPlan, tilePlan } from "./process.ts";

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

  it("fits a forearm design on one portrait A4", () => {
    const plan = sheetPlan(10.7, 27, "a4", true);
    assert.equal(plan.pages, 1);
    assert.equal(plan.pageW, 210);
    assert.equal(plan.pageH, 297);
  });

  it("asks extract to leave the skin behind", () => {
    const prompt = prepPrompt({ task: "extract", variation: 2 });
    assert.match(prompt, /skin/);
    assert.match(prompt, /white/i);
    assert.match(prompt, /alternative 2/);
  });

  it("asks for a printer stencil, not a photo", () => {
    const outline = prepPrompt({ task: "stencil", stencilMode: "outline" });
    const hatch = prepPrompt({ task: "stencil", stencilMode: "hatching" });
    const shade = prepPrompt({ task: "stencil", stencilMode: "shading" });
    assert.match(outline, /contour lines only/);
    assert.match(hatch, /cross-hatch/);
    assert.match(shade, /stipple/);
    assert.doesNotMatch(outline, /photograph of the same/);
  });

  it("keeps enhance as a photo restore", () => {
    const prompt = prepPrompt({ task: "enhance" });
    assert.match(prompt, /photograph/);
    assert.match(prompt, /Do not redraw/);
  });
});
