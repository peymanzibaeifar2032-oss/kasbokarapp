import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aggregateCashForMonth } from "../pocket/revenue-month.ts";
import { isStudioOwnerEmail } from "../studio-owner.ts";

describe("app analytics helpers", () => {
  it("aggregates jalali-month cash without double-counting other months", () => {
    const sum = aggregateCashForMonth(
      [
        { day: "1405-08-01", kind: "income", amountToman: 100 },
        { day: "1405-08-15", kind: "income", amountToman: 50 },
        { day: "1405-08-15", kind: "expense", amountToman: 20 },
        { day: "1405-07-20", kind: "income", amountToman: 999 },
      ],
      1405,
      8,
    );
    assert.equal(sum.income, 150);
    assert.equal(sum.expense, 20);
  });

  it("owner email gate matches Peyman only", () => {
    assert.equal(isStudioOwnerEmail("peyman.zibaeifar2032@gmail.com"), true);
    assert.equal(isStudioOwnerEmail("other@example.com"), false);
  });
});
