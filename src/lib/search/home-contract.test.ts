import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

describe("Home simple search contract", () => {
  const src = readFileSync(join(process.cwd(), "src/routes/index.tsx"), "utf8");

  it("does not import the sentence parser or intent chips", () => {
    assert.equal(src.includes("parseSearchQuery"), false);
    assert.equal(src.includes("applySearchIntent"), false);
    assert.equal(src.includes("intentChip"), false);
    assert.equal(src.includes("intentWhat"), false);
    assert.equal(src.includes("چی:"), false);
  });

  it("does not set category from the typed query", () => {
    assert.equal(/setCategoryId\(\s*parsed/.test(src), false);
    assert.equal(src.includes("setCategoryId(c.id)"), true);
  });
});
