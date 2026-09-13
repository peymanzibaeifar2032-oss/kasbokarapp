import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canSeeBusinessFinance, canSeeCustomerPayment, callbackIsNotProof, maskIban, rejectClientAmount } from "./access.ts";
import { applyCommission, pickCommissionRule } from "./commission.ts";
import { FinanceEngine } from "./engine.ts";
import { assertBalanced, LedgerBook, paymentEntries } from "./ledger.ts";
import { irrToToman, percentBps, tomanToIrr } from "./money.ts";
import { vandarStatus } from "./providers/vandar.ts";

const RULES = [{ id: "platform", scope: "platform" as const, percentBps: 500, fixedIrr: 0, active: true }];

describe("money IRR/Toman", () => {
  it("converts without mixing units", () => {
    assert.equal(tomanToIrr(2_000_000), 20_000_000);
    assert.equal(irrToToman(20_000_000), 2_000_000);
    assert.equal(percentBps(20_000_000, 500), 1_000_000);
  });
  it("rejects float money", () => {
    assert.throws(() => tomanToIrr(1.5));
  });
});

describe("ledger", () => {
  it("A verified payment posts a balanced ledger", () => {
    const entries = paymentEntries({ grossIrr: 20_000_000, commissionIrr: 1_000_000, businessId: "b1" });
    assertBalanced(entries);
    const book = new LedgerBook();
    book.post({ id: "t1", kind: "pay", idempotencyKey: "k1", entries });
    assert.equal(book.payable("b1"), 19_000_000);
    assert.equal(-book.balance("platform_commission"), 1_000_000);
  });

  it("B duplicate verification does not double-credit", () => {
    const eng = new FinanceEngine(RULES);
    eng.createPayment({
      id: "p1",
      bookingId: "bk",
      customerId: "c",
      businessId: "b1",
      amountIrr: 20_000_000,
      purpose: "full",
      idempotencyKey: "idem-1",
    });
    eng.verifyAndPost("p1", "paid");
    eng.verifyAndPost("p1", "paid");
    assert.equal(eng.book.payable("b1"), 19_000_000);
    assert.equal(eng.book.txs.size, 1);
  });

  it("C duplicate webhook does not double-credit", () => {
    const eng = new FinanceEngine(RULES);
    eng.createPayment({
      id: "p2",
      bookingId: "bk",
      customerId: "c",
      businessId: "b1",
      amountIrr: 20_000_000,
      purpose: "full",
      idempotencyKey: "idem-2",
    });
    eng.handleWebhook("ev1", "p2", "paid");
    eng.handleWebhook("ev1", "p2", "paid");
    eng.handleWebhook("ev2", "p2", "paid");
    assert.equal(eng.book.payable("b1"), 19_000_000);
  });
});

describe("commission", () => {
  it("D commission is server-side", () => {
    const snap = applyCommission(20_000_000, RULES[0]);
    assert.equal(snap.commissionIrr, 1_000_000);
    assert.equal(snap.businessNetIrr, 19_000_000);
  });

  it("E historical snapshot is immutable when rules change", () => {
    const eng = new FinanceEngine(RULES);
    eng.createPayment({
      id: "p3",
      bookingId: "bk",
      customerId: "c",
      businessId: "b1",
      amountIrr: 20_000_000,
      purpose: "full",
      idempotencyKey: "idem-3",
    });
    const first = eng.verifyAndPost("p3", "paid");
    eng.rules = [{ ...RULES[0], percentBps: 1000 }];
    assert.equal(first.snapshot?.percentBps, 500);
    assert.equal(first.snapshot?.commissionIrr, 1_000_000);
    const later = pickCommissionRule(eng.rules, { businessId: "b1" });
    assert.equal(later.percentBps, 1000);
  });
});

describe("settlement and refund", () => {
  function paid() {
    const eng = new FinanceEngine(RULES);
    eng.createPayment({
      id: "p4",
      bookingId: "bk",
      customerId: "c",
      businessId: "b1",
      amountIrr: 20_000_000,
      purpose: "full",
      idempotencyKey: "idem-4",
    });
    eng.verifyAndPost("p4", "paid");
    return eng;
  }

  it("F business balance equals ledger", () => {
    const eng = paid();
    assert.equal(eng.book.settleable("b1"), 19_000_000);
  });

  it("G concurrent settlement cannot overspend", () => {
    const eng = paid();
    eng.requestSettlement({ id: "s1", businessId: "b1", amountIrr: 19_000_000, idempotencyKey: "s-a" });
    assert.throws(() => eng.requestSettlement({ id: "s2", businessId: "b1", amountIrr: 1, idempotencyKey: "s-b" }));
  });

  it("H failed settlement restores payable", () => {
    const eng = paid();
    eng.requestSettlement({ id: "s1", businessId: "b1", amountIrr: 5_000_000, idempotencyKey: "s-c" });
    assert.equal(eng.book.settleable("b1"), 14_000_000);
    eng.failSettlement("s1");
    assert.equal(eng.book.settleable("b1"), 19_000_000);
  });

  it("I refund creates reversal entries", () => {
    const eng = paid();
    eng.refund("p4", 20_000_000);
    assert.equal(Math.abs(eng.book.payable("b1")), 0);
    assert.equal(eng.book.balance("refund_liability"), -20_000_000);
  });

  it("J duplicate refund prevented", () => {
    const eng = paid();
    eng.refund("p4", 20_000_000);
    assert.throws(() => eng.refund("p4", 20_000_000));
  });
});

describe("security", () => {
  it("K customer cannot access another payment", () => {
    assert.equal(canSeeCustomerPayment({ actorId: "c1", isAdmin: false, customerId: "c2" }), false);
    assert.equal(canSeeCustomerPayment({ actorId: "c1", isAdmin: false, customerId: "c1" }), true);
  });

  it("L business cannot access another business finance", () => {
    assert.equal(canSeeBusinessFinance({ actorId: "o1", isAdmin: false, ownerId: "o2" }), false);
    assert.equal(canSeeBusinessFinance({ actorId: "o1", isAdmin: false, ownerId: "o1" }), true);
  });

  it("M non-admin cannot access admin finance", () => {
    assert.equal(canSeeBusinessFinance({ actorId: "x", isAdmin: false, ownerId: "other" }), false);
    assert.equal(canSeeBusinessFinance({ actorId: "x", isAdmin: true, ownerId: "other" }), true);
  });

  it("O frontend amount manipulation rejected", () => {
    assert.throws(() => rejectClientAmount(20_000_000, 1));
    assert.equal(rejectClientAmount(20_000_000, 20_000_000), 20_000_000);
  });

  it("P callback alone cannot mark payment paid", () => {
    const eng = new FinanceEngine(RULES);
    eng.createPayment({
      id: "p5",
      bookingId: "bk",
      customerId: "c",
      businessId: "b1",
      amountIrr: 1000,
      purpose: "full",
      idempotencyKey: "idem-5",
    });
    assert.throws(() => eng.applyBrowserCallback("p5", true));
    assert.throws(() => callbackIsNotProof());
    assert.equal(eng.payments.get("p5")?.status, "created");
  });

  it("Q provider secret is not in client-facing status", () => {
    const st = vandarStatus();
    assert.equal("apiKey" in st, false);
    assert.equal(JSON.stringify(st).includes("sk_"), false);
  });
});

describe("iban mask", () => {
  it("masks IBAN", () => {
    assert.equal(maskIban("IR260620000000203443585001"), "IR••••••5001");
  });
});

describe("provider disabled", () => {
  it("Vandar stays disabled without credentials", () => {
    assert.equal(vandarStatus().mode, "configured_but_disabled");
    assert.equal(vandarStatus().paymentReady, false);
  });
});
