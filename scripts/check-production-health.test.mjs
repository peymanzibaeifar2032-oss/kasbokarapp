import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  isExpectedProductionRelease,
  parseCliArgs,
  parseProductionHealth,
  resolveExpectedSha,
} from "./check-production-health.mjs";

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

test("resolveExpectedSha prefers workflow_run head sha and uses current sha otherwise", () => {
  assert.equal(
    resolveExpectedSha({
      eventName: "workflow_run",
      workflowRunHeadSha: "abc123",
      currentSha: "zzz999",
    }),
    "abc123",
  );
  assert.equal(
    resolveExpectedSha({
      eventName: "workflow_dispatch",
      workflowRunHeadSha: "",
      currentSha: "zzz999",
    }),
    "zzz999",
  );
  assert.equal(
    resolveExpectedSha({
      eventName: "workflow_run",
      workflowRunHeadSha: "",
      currentSha: "zzz999",
    }),
    null,
  );
});

test("parseCliArgs reads workflow flags", () => {
  assert.deepEqual(
    parseCliArgs([
      "https://kasbokarapp.com/api/health",
      "--event-name",
      "workflow_run",
      "--workflow-run-head-sha",
      "abc123",
      "--current-sha",
      "zzz999",
    ]),
    {
      url: "https://kasbokarapp.com/api/health",
      eventName: "workflow_run",
      workflowRunHeadSha: "abc123",
      currentSha: "zzz999",
    },
  );
});

test("parseCliArgs rejects missing flag values", () => {
  assert.throws(
    () => parseCliArgs(["https://kasbokarapp.com/api/health", "--event-name"]),
    /missing value for --event-name/,
  );
});

test("cli exits non-zero for stale releases", async () => {
  const result = spawnSync(
    process.execPath,
    [
      "scripts/check-production-health.mjs",
      'data:application/json,{"ok":true,"sha":"old-sha"}',
      "--event-name",
      "workflow_run",
      "--workflow-run-head-sha",
      "new-sha",
      "--current-sha",
      "ignored",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /stale release/);
});
