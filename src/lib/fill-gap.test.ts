import assert from "node:assert/strict";
import test from "node:test";
import { pieceMinutes, suggestWaitlist } from "./fill-gap.ts";

const now = Date.parse("2026-09-27T12:00:00Z");

test("a month of waiting beats a tighter new piece", () => {
  const remaining = 120;
  const { primary } = suggestWaitlist(
    remaining,
    [
      { id: "new", name: "جدید", phone: "09120000001", minutes: 120, createdAt: "2026-09-26T12:00:00Z" },
      { id: "old", name: "منتظر", phone: "09120000002", minutes: 60, createdAt: "2026-08-20T12:00:00Z" },
    ],
    new Set(),
    now,
  );
  assert.equal(primary?.id, "old");
});

test("a piece that does not fit is never suggested", () => {
  const { primary } = suggestWaitlist(
    120,
    [{ id: "long", name: "بلند", phone: "09120000003", minutes: 180, createdAt: "2026-08-01T12:00:00Z" }],
    new Set(),
    now,
  );
  assert.equal(primary, null);
});

test("someone already booked that day is skipped", () => {
  const { primary } = suggestWaitlist(
    180,
    [{ id: "busy", name: "مشغول", phone: "09121111111", minutes: 60, createdAt: "2026-08-01T12:00:00Z" }],
    new Set(["9121111111"]),
    now,
  );
  assert.equal(primary, null);
});

test("saved piece time wins over an older session", () => {
  assert.deepEqual(pieceMinutes(120, 360), { minutes: 120, source: "piece" });
  assert.deepEqual(pieceMinutes(0, 240), { minutes: 240, source: "history" });
});
