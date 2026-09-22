import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { digitsOnly, formatGroupedDigits } from "./tattoo-flow.ts";

describe("money entry grouping", () => {
  it("shows a thousands separator while keeping raw digits", () => {
    assert.equal(formatGroupedDigits("22000000"), "۲۲٬۰۰۰٬۰۰۰");
    assert.equal(formatGroupedDigits("300000000"), "۳۰۰٬۰۰۰٬۰۰۰");
    assert.equal(digitsOnly("۲۲٬۰۰۰٬۰۰۰"), "22000000");
    assert.equal(digitsOnly("۲۲،۰۰۰،۰۰۰"), "22000000");
    assert.equal(formatGroupedDigits(""), "");
    assert.equal(digitsOnly("00012000"), "12000");
  });
});
