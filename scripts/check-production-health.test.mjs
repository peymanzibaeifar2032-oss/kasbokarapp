import assert from "node:assert/strict";
import test from "node:test";
import { isExpectedProductionRelease, parseProductionHealth } from "./check-production-health.mjs";

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

test("rejects 200 payloads that are valid json but missing required fields", () => {
  assert.equal(
    isExpectedProductionRelease(JSON.stringify({ status: "ok", release: "abc123" }), "abc123"),
    false,
  );
});

test("parseProductionHealth returns parsed json or null", () => {
  assert.deepEqual(parseProductionHealth('{"ok":true,"sha":"abc123"}'), {
    ok: true,
    sha: "abc123",
  });
  assert.equal(parseProductionHealth("not-json"), null);
  assert.equal(parseProductionHealth("true"), null);
  assert.equal(parseProductionHealth("null"), null);
  assert.equal(parseProductionHealth("[]"), null);
});
