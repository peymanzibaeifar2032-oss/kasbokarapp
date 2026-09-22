import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPRENTICE_SESSION_GOAL,
  STUDIO_APPRENTICE_SEEDS,
  STUDIO_APPRENTICE_TEMPLATE,
  apprenticeRemaining,
  closeThursdayHours,
  formatThursdayLabel,
  isTehranThursday,
  nextSessionNumber,
  upcomingThursdays,
} from "./studio-apprentices.ts";

describe("studio apprentice Thursdays", () => {
  it("keeps the four lesson slots, lunch, and Sina as substitute only", () => {
    assert.equal(STUDIO_APPRENTICE_TEMPLATE.filter((row) => row.kind === "lesson").length, 4);
    assert.equal(STUDIO_APPRENTICE_TEMPLATE.filter((row) => row.kind === "lunch").length, 1);
    const sina = STUDIO_APPRENTICE_SEEDS.find((row) => row.slug === "sina");
    assert.equal(sina?.kind, "substitute");
    assert.equal(sina?.defaultSlotKey, null);
    assert.equal(STUDIO_APPRENTICE_SEEDS[0]?.name, "آرمان رستمی");
    assert.equal(STUDIO_APPRENTICE_SEEDS[0]?.phone, "09910476671");
  });

  it("treats 24 Sep 2026 as Thursday and lists upcoming Thursdays", () => {
    assert.equal(isTehranThursday("2026-09-24"), true);
    assert.equal(isTehranThursday("2026-09-22"), false);
    const days = upcomingThursdays(new Date("2026-09-22T08:00:00.000Z"), 4);
    assert.deepEqual(days, ["2026-09-24", "2026-10-01", "2026-10-08", "2026-10-15"]);
    assert.match(formatThursdayLabel("2026-09-24"), /پنجشنبه/);
  });

  it("counts remaining sessions from the number Peyman enters", () => {
    assert.equal(APPRENTICE_SESSION_GOAL, 10);
    assert.equal(apprenticeRemaining(0), 10);
    assert.equal(apprenticeRemaining(4), 6);
    assert.equal(apprenticeRemaining(10), 0);
    assert.equal(nextSessionNumber(4), 5);
    assert.equal(nextSessionNumber(10), 10);
  });

  it("closes Thursday on studio work hours so customers cannot book", () => {
    const hours = closeThursdayHours([
      { day: "چهارشنبه", open: "09:00", close: "18:00", closed: false },
      { day: "پنجشنبه", open: "09:00", close: "14:00", closed: false },
    ]);
    const thursday = hours.find((row) => row.day === "پنجشنبه");
    assert.equal(thursday?.closed, true);
    assert.equal(thursday?.open, "");
  });
});
