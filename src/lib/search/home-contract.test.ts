import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

// The marketplace home page was retired: "/" now always sends visitors to the studio page.
describe("Home route", () => {
  const src = readFileSync(join(process.cwd(), "src/routes/index.tsx"), "utf8");

  it("redirects to /studio and carries no old marketplace search", () => {
    assert.match(src, /redirect\(\{\s*to:\s*"\/studio"\s*\}\)/);
    assert.equal(src.includes("parseSearchQuery"), false);
    assert.equal(src.includes("LocationPicker"), false);
  });
});
