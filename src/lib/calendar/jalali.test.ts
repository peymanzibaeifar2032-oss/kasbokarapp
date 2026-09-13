import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gregorianToJalali,
  jalaliMonthGrid,
  jalaliMonthLength,
  jalaliToGregorian,
  shiftJalaliMonth,
  WEEKDAY_SHORT_FA,
} from "./jalali.ts";
import { DEFAULT_BOOKING_HORIZON_DAYS, monthDayStates, statusForDay, tehranLocalToIso } from "../hours.ts";
import type { Business } from "../types.ts";

describe("jalali conversion", () => {
  it("maps 12 Sep 2026 to Shahrivar 1405 Saturday", () => {
    const j = gregorianToJalali(2026, 9, 12);
    assert.equal(j.jy, 1405);
    assert.equal(j.jm, 6);
    assert.equal(j.jd, 21);
    const g = jalaliToGregorian(1405, 6, 21);
    assert.deepEqual(g, { gy: 2026, gm: 9, gd: 12 });
  });

  it("month grid starts on Saturday and has 7-day weeks", () => {
    const cells = jalaliMonthGrid(1405, 6);
    assert.equal(cells.length % 7, 0);
    const firstIn = cells.find((c) => c.inMonth);
    assert.ok(firstIn);
    assert.equal(WEEKDAY_SHORT_FA.length, 7);
    assert.equal(cells[0].satIndex, 0);
  });

  it("shahrivar has 31 days", () => {
    assert.equal(jalaliMonthLength(1405, 6), 31);
  });

  it("shift month wraps year", () => {
    assert.deepEqual(shiftJalaliMonth(1405, 12, 1), { jy: 1406, jm: 1 });
    assert.deepEqual(shiftJalaliMonth(1405, 1, -1), { jy: 1404, jm: 12 });
  });
});

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
  return { workHours: partial.workHours ?? HOURS, slotMinutes: partial.slotMinutes ?? 60, prices: partial.prices ?? [] };
}

describe("month availability from engine", () => {
  const now = new Date(tehranLocalToIso(2026, 9, 12, 8, 0));

  it("past dates are past and Friday is closed", () => {
    const days = monthDayStates(biz(), [], 1405, 6, now, 60);
    const yesterday = days.find((d) => d.cell.dayKey === "2026-09-11");
    assert.equal(yesterday?.status, "past");
    const friday = days.find((d) => d.cell.dayKey === "2026-09-18");
    assert.equal(friday?.status, "closed");
  });

  it("full day when occupancy covers work hours", () => {
    const days = monthDayStates(
      biz(),
      [{ start: tehranLocalToIso(2026, 9, 12, 9, 0), end: tehranLocalToIso(2026, 9, 12, 18, 0) }],
      1405,
      6,
      now,
      60,
    );
    const sat = days.find((d) => d.cell.dayKey === "2026-09-12");
    assert.equal(sat?.status, "full");
  });

  it("120 minute service can make a short opening unbookable", () => {
    const short = [
      ...HOURS.slice(0, 6).map((h) => ({ ...h, open: "09:00", close: "10:30" })),
      HOURS[6],
    ];
    const long = monthDayStates(biz({ workHours: short }), [], 1405, 6, now, 120);
    const sat = long.find((d) => d.cell.dayKey === "2026-09-12");
    assert.ok(sat?.status === "full" || sat?.status === "closed");
    const shortJob = monthDayStates(biz({ workHours: short }), [], 1405, 6, now, 30);
    const satShort = shortJob.find((d) => d.cell.dayKey === "2026-09-12");
    assert.equal(satShort?.status, "free");
  });

  it("special-hours closed overrides weekly open", () => {
    const days = monthDayStates(biz(), [], 1405, 6, now, 60, {
      specialDays: [{ dayKey: "2026-09-13", closed: true, shifts: [] }],
    });
    const sun = days.find((d) => d.cell.dayKey === "2026-09-13");
    assert.equal(sun?.status, "closed");
  });

  it("horizon marks beyond", () => {
    assert.equal(statusForDay("2099-01-01", [], { todayKey: "2026-09-12", horizonKey: "2026-11-11", closed: false }), "beyond");
    assert.equal(DEFAULT_BOOKING_HORIZON_DAYS, 60);
  });
});
