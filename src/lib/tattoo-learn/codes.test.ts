import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canAddDevice, formatCode, makeActivationCode, normalizeCode } from "./codes.ts";

describe("tattoo learn codes", () => {
  it("builds a fixed-shape code from bytes", () => {
    const code = makeActivationCode(new Uint8Array(10).fill(1));
    assert.match(code, /^TT-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{2}$/);
  });

  it("normalizes spaces and dashes", () => {
    assert.equal(normalizeCode(" tt-ab23-cd45-ef "), "TTAB23CD45EF");
    assert.equal(formatCode("ttab23cd45ef"), "TT-AB23-CD45-EF");
  });

  it("refuses a new device when the code is full", () => {
    assert.equal(canAddDevice(1, 1), false);
    assert.equal(canAddDevice(0, 1), true);
    assert.equal(canAddDevice(1, 2), true);
  });
});
