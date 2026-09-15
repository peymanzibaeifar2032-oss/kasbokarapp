import assert from "node:assert/strict";
import test from "node:test";
import { isExpectedProductionRelease } from "./check-production-health.mjs";

test("accepts healthy payload with matching sha", () => {
  assert.equal(
    isExpectedProductionRelease(JSON.stringify({ ok: true, sha: "abc123" }), "abc123"),
    true,
  );
});

test("rejects unhealthy payloads, wrong sha, and invalid json", () => {
  assert.equal(
    isExpectedProductionRelease(JSON.stringify({ ok: false, sha: "abc123" }), "abc123"),
    false,
  );
  assert.equal(
    isExpectedProductionRelease(JSON.stringify({ ok: true, sha: "old" }), "abc123"),
    false,
  );
  assert.equal(isExpectedProductionRelease("not-json", "abc123"), false);
});
