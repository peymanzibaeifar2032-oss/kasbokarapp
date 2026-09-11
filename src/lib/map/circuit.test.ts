import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { circuitState, isUsable, recordFailure, recordSuccess } from "./circuit.ts";

describe("map circuit", () => {
  it("opens after threshold failures and cools down", () => {
    let c = { failures: 0, openUntil: 0 };
    c = recordFailure(c, 1000, 3, 60_000);
    c = recordFailure(c, 1001, 3, 60_000);
    assert.equal(circuitState(c, 1002), "closed");
    c = recordFailure(c, 1002, 3, 60_000);
    assert.equal(circuitState(c, 1003), "open");
    assert.equal(isUsable(c, 1003), false);
    assert.equal(circuitState(c, 1002 + 60_000), "half-open");
    c = recordSuccess(c);
    assert.equal(circuitState(c, 1002 + 60_001), "closed");
  });
});
