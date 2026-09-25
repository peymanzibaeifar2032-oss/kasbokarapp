import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chairBalance, flatRentDue, flatUnitsInRange, splitChairJob, sumChairJobs } from "./studio-chair.ts";

describe("chair rent math", () => {
  it("splits a design by shop percent", () => {
    assert.deepEqual(splitChairJob(20_000_000, 30), {
      total: 20_000_000,
      shop: 6_000_000,
      artist: 14_000_000,
      percentShop: 30,
    });
  });

  it("only counts finished jobs for percent rent", () => {
    const sum = sumChairJobs(
      [
        { priceToman: 10_000_000, status: "done" },
        { priceToman: 8_000_000, status: "planned" },
        { priceToman: 2_000_000, status: "cancelled" },
      ],
      25,
    );
    assert.equal(sum.jobCount, 1);
    assert.equal(sum.shop, 2_500_000);
    assert.equal(sum.artist, 7_500_000);
  });

  it("counts flat daily / weekly / monthly units", () => {
    assert.equal(flatUnitsInRange("day", 10), 10);
    assert.equal(flatUnitsInRange("week", 10), 2);
    assert.equal(flatUnitsInRange("month", 28), 1);
    assert.equal(flatRentDue("month", 15_000_000, 1), 15_000_000);
  });

  it("tracks remaining chair rent after payments", () => {
    const row = chairBalance(15_000_000, 5_000_000);
    assert.equal(row.remaining, 10_000_000);
    assert.equal(row.settled, false);
  });
});
