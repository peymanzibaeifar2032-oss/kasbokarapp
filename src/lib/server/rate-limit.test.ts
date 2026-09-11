import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allowRate } from "./rate-limit.ts";

describe("rate limit", () => {
  it("allows up to max then blocks inside the window", () => {
    const key = `t-${Math.random()}`;
    const t = 1_000_000;
    assert.equal(allowRate(key, 2, 1000, t), true);
    assert.equal(allowRate(key, 2, 1000, t + 1), true);
    assert.equal(allowRate(key, 2, 1000, t + 2), false);
  });

  it("resets after the window", () => {
    const key = `t-${Math.random()}`;
    const t = 2_000_000;
    assert.equal(allowRate(key, 1, 50, t), true);
    assert.equal(allowRate(key, 1, 50, t + 10), false);
    assert.equal(allowRate(key, 1, 50, t + 51), true);
  });
});
