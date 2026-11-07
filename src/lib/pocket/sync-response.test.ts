import test from "node:test";
import assert from "node:assert/strict";
import { parsePocketExport } from "./sync-response.ts";
import { applyDownload } from "../pocket-book.ts";

const row = { serverId: "request-1", day: "1405-08-15", time: "14:30", name: "Synthetic test", phone: "", style: "test", placement: "arm" };

test("valid server snapshot merges idempotently and preserves edited local records", () => {
  const incoming = parsePocketExport(200, { bookings: [row] });
  const first = applyDownload([], incoming);
  assert.equal(first.length, 1);
  assert.deepEqual(applyDownload(first, incoming), first);
  const moved = [{ ...first[0], day: "1405-08-16", pinned: true }];
  assert.equal(applyDownload(moved, incoming)[0].day, "1405-08-16");
});

test("empty authenticated snapshot is valid, malformed snapshots are never mistaken for empty", () => {
  assert.deepEqual(parsePocketExport(200, { bookings: [] }), []);
  for (const data of [null, {}, { error: "Forbidden" }, "<html>", { bookings: [{}] }, { bookings: [row, row] }, { bookings: [{ ...row, day: "2026-11-06" }] }]) {
    assert.throws(() => parsePocketExport(200, data));
  }
});

test("HTTP auth, permission, endpoint and transport failures stay distinct", () => {
  assert.throws(() => parsePocketExport(401, {}), /حساب سایت/);
  assert.throws(() => parsePocketExport(403, {}), /صاحب استودیو/);
  assert.throws(() => parsePocketExport(404, {}), /انتشار سرور/);
  assert.throws(() => parsePocketExport(0, {}), /kasbokarapp.com/);
  assert.throws(() => parsePocketExport(503, { error: "Maintenance" }), /Maintenance/);
});
