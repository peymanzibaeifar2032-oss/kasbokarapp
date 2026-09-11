import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isIranMobile, normalizeIranPhone, parseToman } from "./format.ts";

describe("iran phone", () => {
  it("normalizes persian digits and 98 prefix", () => {
    assert.equal(normalizeIranPhone("۰۹۱۲۶۸۱۲۸۵۲"), "09126812852");
    assert.equal(normalizeIranPhone("+98 912 681 2852"), "09126812852");
    assert.equal(normalizeIranPhone("9126812852"), "09126812852");
    assert.equal(isIranMobile("۰۹۱۲۶۸۱۲۸۵۲"), true);
    assert.equal(isIranMobile("09126812852"), true);
    assert.equal(isIranMobile("123"), false);
    assert.equal(parseToman("۶۰۰۰۰۰"), 600000);
    assert.equal(parseToman("600,000"), 600000);
  });
});
