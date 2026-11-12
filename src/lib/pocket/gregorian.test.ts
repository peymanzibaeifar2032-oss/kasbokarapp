import test from "node:test";
import assert from "node:assert/strict";
import { gregorianToJalali, jalaliToGregorian, jalaliMonthLength } from "../calendar/jalali.ts";
import { gregorianMonthGrid, gregorianOfKey, shiftGregorianMonth } from "./gregorian.ts";

test("Jalali anchors: Nowruz 1404/1405, today, leap Esfand", () => {
  assert.deepEqual(gregorianToJalali(2025, 3, 21), { jy: 1404, jm: 1, jd: 1 });
  assert.deepEqual(gregorianToJalali(2026, 3, 21), { jy: 1405, jm: 1, jd: 1 });
  assert.deepEqual(gregorianToJalali(2026, 11, 12), { jy: 1405, jm: 8, jd: 21 });
  assert.deepEqual(jalaliToGregorian(1403, 12, 30), { gy: 2025, gm: 3, gd: 20 });
  assert.equal(jalaliMonthLength(1403, 12), 30);
  assert.equal(jalaliMonthLength(1404, 12), 29);
});

test("Gregorian grid: Sunday first, whole weeks, Jalali keys on every cell", () => {
  const cells = gregorianMonthGrid(2026, 11);
  assert.equal(cells.length % 7, 0);
  const inMonth = cells.filter((c) => c.inMonth);
  assert.equal(inMonth.length, 30);
  assert.deepEqual([inMonth[0].gy, inMonth[0].gm, inMonth[0].gd], [2026, 11, 1]);
  // 1 Nov 2026 is a Sunday → first cell, no padding.
  assert.equal(cells[0].gd, 1);
  const d12 = inMonth[11];
  assert.deepEqual([d12.jy, d12.jm, d12.jd], [1405, 8, 21]);
  assert.equal(d12.satIndex, 5); // Thursday (Sat=0)
  const feb = gregorianMonthGrid(2028, 2).filter((c) => c.inMonth);
  assert.equal(feb.length, 29);
});

test("month shift and key conversion", () => {
  assert.deepEqual(shiftGregorianMonth(2026, 12, 1), { gy: 2027, gm: 1 });
  assert.deepEqual(shiftGregorianMonth(2026, 1, -1), { gy: 2025, gm: 12 });
  assert.deepEqual(gregorianOfKey("1405-08-21"), { gy: 2026, gm: 11, gd: 12 });
  assert.equal(gregorianOfKey("bad"), null);
});
