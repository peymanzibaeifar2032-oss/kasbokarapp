import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accountTotals, monthCustomerLines, openReceivable, paymentPlan, receiptPlan, samePersonWarnings, studioMonthSummary, type ReceivableJob } from "./studio-finance.ts";

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

  it("keeps one price when the same tattoo continues into later months", () => {
    const rows: ReceivableJob[] = [
      { who: "09120000000", style: "گلادیاتور", placement: "ساعد", price: 60_000_000, paid: 49_000_000, continuation: false, followUp: false, closed: false, inMonth: true },
      { who: "09120000000", style: "گلادیاتور", placement: "ساعد", price: 60_000_000, paid: 49_000_000, continuation: false, followUp: true, closed: false, inMonth: true },
      { who: "09120000000", style: "گلادیاتور", placement: "ساعد", price: 60_000_000, paid: 49_000_000, continuation: false, followUp: true, closed: false, inMonth: false },
    ];
    assert.equal(openReceivable(rows, true), 11_000_000);
    assert.equal(openReceivable(rows, false), 11_000_000);
  });

  it("uses the carried remainder after the first session is closed", () => {
    const rows: ReceivableJob[] = [
      { who: "09120000000", style: "گلادیاتور", placement: "ساعد", price: 60_000_000, paid: 27_000_000, continuation: false, followUp: false, closed: true, inMonth: false },
      { who: "09120000000", style: "گلادیاتور", placement: "ساعد", price: 33_000_000, paid: 22_000_000, continuation: true, followUp: false, closed: false, inMonth: true },
    ];
    assert.equal(openReceivable(rows, true), 11_000_000);
  });

  it("does not add the same paid amount twice when the name was saved twice", () => {
    const rows: ReceivableJob[] = [
      { who: "09120000000", style: "گلادیاتور", placement: "ساعد", price: 60_000_000, paid: 54_000_000, continuation: false, followUp: false, closed: false, inMonth: true },
      { who: "09120000000", style: "گلادیاتور", placement: "ساعد", price: 60_000_000, paid: 54_000_000, continuation: false, followUp: false, closed: false, inMonth: true },
    ];
    assert.equal(accountTotals(rows).paid, 54_000_000);
    assert.equal(accountTotals(rows).remaining, 6_000_000);
  });

  it("rolls one phone into one customer line even if one name has a title", () => {
    const lines = monthCustomerLines(
      [
        { who: "09120000000", name: "آقای امیر محمد ضیائی وفا", style: "گلادیاتور", placement: "ساعد", price: 60_000_000, paid: 54_000_000, continuation: false, followUp: false, closed: false, inMonth: true },
        { who: "09120000000", name: "امیر محمد ضیائی وفا", style: "گلادیاتور", placement: "ساعد", price: 60_000_000, paid: 54_000_000, continuation: false, followUp: true, closed: false, inMonth: false },
      ],
      [{ who: "09120000000", amount: 22_000_000, name: "امیر محمد ضیائی وفا" }],
    );
    assert.equal(lines.length, 1);
    assert.equal(lines[0].name, "امیر محمد ضیائی وفا");
    assert.equal(lines[0].price, 60_000_000);
    assert.equal(lines[0].paid, 54_000_000);
    assert.equal(lines[0].paidThisMonth, 22_000_000);
    assert.equal(lines[0].remaining, 6_000_000);
  });

  it("warns when the same name has two different phones", () => {
    const warnings = samePersonWarnings([
      { name: "امیر محمد ضیائی وفا", phone: "09120000000" },
      { name: "آقای امیر محمد ضیائی وفا", phone: "09121111111" },
    ]);
    assert.equal(warnings.length, 1);
    assert.equal(samePersonWarnings([{ name: "امیر محمد ضیائی وفا", phone: "09120000000" }, { name: "آقای امیر محمد ضیائی وفا", phone: "09120000000" }]).length, 0);
  });

  it("adds a new deposit once and does not repeat a receipt that is already recorded", () => {
    assert.deepEqual(paymentPlan(27_000_000, 0, 22_000_000).paid, 49_000_000);
    assert.equal(receiptPlan(0, 0, 27_000_000, false).paid, 27_000_000);
    assert.equal(receiptPlan(27_000_000, 0, 27_000_000, false).paid, 27_000_000);
    assert.equal(receiptPlan(27_000_000, 27_000_000, 27_000_000, true).paid, 27_000_000);
  });
});
