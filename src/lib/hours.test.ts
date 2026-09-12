import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSlots,
  hasFreeToday,
  intervalsOverlap,
  isOpenNow,
  serviceDurationMinutes,
  tehranClock,
  tehranDayBounds,
  tehranDayKey,
  tehranLocalToIso,
  type BusyInterval,
} from "./hours.ts";
import type { Business } from "./types.ts";

const HOURS = [
  { day: "شنبه", open: "09:00", close: "18:00" },
  { day: "یکشنبه", open: "09:00", close: "18:00" },
  { day: "دوشنبه", open: "09:00", close: "18:00" },
  { day: "سه‌شنبه", open: "09:00", close: "18:00" },
  { day: "چهارشنبه", open: "09:00", close: "18:00" },
  { day: "پنجشنبه", open: "09:00", close: "18:00" },
  { day: "جمعه", open: "09:00", close: "18:00", closed: true },
];

function biz(partial: Partial<Pick<Business, "workHours" | "slotMinutes" | "prices">> = {}) {
  return {
    workHours: partial.workHours ?? HOURS,
    slotMinutes: partial.slotMinutes ?? 60,
    prices: partial.prices ?? [],
  };
}

/** Saturday 12 Sep 2026 10:00 Asia/Tehran. */
const SAT_10 = new Date(tehranLocalToIso(2026, 9, 12, 10, 0));

describe("Tehran clock", () => {
  it("maps 10:00 Tehran to the civil Saturday", () => {
    const c = tehranClock(SAT_10);
    assert.equal(c.y, 2026);
    assert.equal(c.m, 9);
    assert.equal(c.day, 12);
    assert.equal(c.hh, 10);
    assert.equal(c.weekday, 6);
    assert.equal(tehranDayKey(SAT_10), "2026-09-12");
  });

  it("day bounds start at 00:00 Tehran and exclude the next civil day", () => {
    const { start, end } = tehranDayBounds(SAT_10, 1);
    assert.equal(tehranClock(new Date(start)).hh, 0);
    assert.equal(tehranDayKey(new Date(start)), "2026-09-12");
    assert.equal(tehranDayKey(new Date(end)), "2026-09-13");
  });
});

describe("interval overlap", () => {
  it("treats ranges as half-open", () => {
    assert.equal(intervalsOverlap(0, 60, 60, 120), false);
    assert.equal(intervalsOverlap(0, 60, 59, 120), true);
    assert.equal(intervalsOverlap(10, 70, 0, 10), false);
    assert.equal(intervalsOverlap(10, 70, 0, 11), true);
  });
});

describe("service duration", () => {
  it("does not pretend to know minutes when the service has none", () => {
    const unknown = serviceDurationMinutes([{ title: "تاتو", price: 1_000_000 }], "تاتو", 60);
    assert.equal(unknown.known, false);
    assert.equal(unknown.minutes, 60);
    const known = serviceDurationMinutes([{ title: "تاتو", price: 1, minutes: 90 }], "تاتو", 60);
    assert.equal(known.known, true);
    assert.equal(known.minutes, 90);
  });
});

describe("true free-today", () => {
  it("is independent of openNow", () => {
    const closedNow = new Date(tehranLocalToIso(2026, 9, 12, 20, 0));
    assert.equal(isOpenNow(HOURS, closedNow), false);
    assert.equal(hasFreeToday(biz(), [], closedNow), false);
    const morning = new Date(tehranLocalToIso(2026, 9, 12, 8, 0));
    assert.equal(isOpenNow(HOURS, morning), false);
    assert.equal(hasFreeToday(biz(), [], morning), true);
  });

  it("hides a booked interval from remaining slots", () => {
    const now = new Date(tehranLocalToIso(2026, 9, 12, 8, 0));
    const start = tehranLocalToIso(2026, 9, 12, 11, 0);
    const end = tehranLocalToIso(2026, 9, 12, 12, 0);
    const busy: BusyInterval[] = [{ start, end }];
    const slots = buildSlots(biz(), busy, 1, now, 60);
    assert.equal(slots.some((s) => s.iso === start), false);
    assert.equal(hasFreeToday(biz(), busy, now), true);
  });

  it("a block covering the rest of the day makes hasFreeToday false", () => {
    const now = new Date(tehranLocalToIso(2026, 9, 12, 8, 0));
    const busy: BusyInterval[] = [
      { start: tehranLocalToIso(2026, 9, 12, 9, 0), end: tehranLocalToIso(2026, 9, 12, 18, 0) },
    ];
    assert.equal(hasFreeToday(biz(), busy, now), false);
    assert.equal(buildSlots(biz(), busy, 1, now).length, 0);
  });

  it("a 90-minute job occupying 10:00-11:30 hides the 11:00 60-minute slot", () => {
    const now = new Date(tehranLocalToIso(2026, 9, 12, 8, 0));
    const busy: BusyInterval[] = [
      { start: tehranLocalToIso(2026, 9, 12, 10, 0), end: tehranLocalToIso(2026, 9, 12, 11, 30) },
    ];
    const slots = buildSlots(biz(), busy, 1, now, 60);
    assert.equal(slots.some((s) => s.label === "10:00"), false);
    assert.equal(slots.some((s) => s.label === "11:00"), false);
    assert.equal(slots.some((s) => s.label === "12:00"), true);
  });

  it("skips Friday when that weekday is closed", () => {
    const fridayMorning = new Date(tehranLocalToIso(2026, 9, 11, 8, 0));
    assert.equal(tehranClock(fridayMorning).weekday, 5);
    assert.equal(hasFreeToday(biz(), [], fridayMorning), false);
  });

  it("does not emit a slot that starts after close minus duration", () => {
    const now = new Date(tehranLocalToIso(2026, 9, 12, 8, 0));
    const slots = buildSlots(biz(), [], 1, now, 60);
    assert.equal(slots.some((s) => s.label === "18:00"), false);
    assert.equal(slots.some((s) => s.label === "17:00"), true);
  });
});
