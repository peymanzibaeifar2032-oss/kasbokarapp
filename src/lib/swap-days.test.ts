import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { swapDaySlots, tehranClock, tehranLocalToIso } from "./hours.ts";

describe("swap appointment days", () => {
  it("exchanges the days and keeps each clock time", () => {
    const matin = tehranLocalToIso(2026, 10, 6, 10, 30);
    const milad = tehranLocalToIso(2026, 10, 19, 10, 30);
    const swapped = swapDaySlots(matin, 200, milad, 180);
    assert.ok(swapped);
    const matinNext = tehranClock(new Date(swapped.a.start));
    const miladNext = tehranClock(new Date(swapped.b.start));
    assert.equal(matinNext.day, 19);
    assert.equal(matinNext.hh, 10);
    assert.equal(matinNext.mm, 30);
    assert.equal(miladNext.day, 6);
    assert.equal(miladNext.hh, 10);
    assert.equal(Date.parse(swapped.a.end) - Date.parse(swapped.a.start), 200 * 60000);
    assert.equal(Date.parse(swapped.b.end) - Date.parse(swapped.b.start), 180 * 60000);
  });

  it("does not swap two jobs already on the same day", () => {
    const morning = tehranLocalToIso(2026, 10, 6, 10, 30);
    const afternoon = tehranLocalToIso(2026, 10, 6, 15, 0);
    assert.equal(swapDaySlots(morning, 120, afternoon, 120), null);
  });
});
