import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { studioMonthSummary } from "./studio-finance.ts";

describe("studio month money", () => {
  it("keeps salon profit separate from rent and home costs", () => {
    const out = studioMonthSummary(40_000_000, 8_000_000, 12_000_000, [
      { category: "supplies", amountToman: 3_000_000 },
      { category: "salon_rent", amountToman: 10_000_000 },
      { category: "home_rent", amountToman: 8_000_000 },
      { category: "insurance", amountToman: 2_000_000 },
      { category: "home", amountToman: 4_000_000 },
    ]);
    assert.equal(out.paid, 40_000_000);
    assert.equal(out.remainingMonth, 8_000_000);
    assert.equal(out.salonCost, 13_000_000);
    assert.equal(out.lifeCost, 14_000_000);
    assert.equal(out.salonProfit, 27_000_000);
    assert.equal(out.leftover, 13_000_000);
  });

  it("keeps a deficit after life costs instead of hiding it", () => {
    const out = studioMonthSummary(10_000_000, 0, 0, [
      { category: "salon_rent", amountToman: 8_000_000 },
      { category: "home_rent", amountToman: 12_000_000 },
    ]);
    assert.equal(out.salonProfit, 2_000_000);
    assert.equal(out.leftover, -10_000_000);
  });

  it("does not treat remaining customer balance as cash", () => {
    const out = studioMonthSummary(0, 5_000_000, 5_000_000, []);
    assert.equal(out.paid, 0);
    assert.equal(out.salonProfit, 0);
    assert.equal(out.remainingAll, 5_000_000);
  });
});
