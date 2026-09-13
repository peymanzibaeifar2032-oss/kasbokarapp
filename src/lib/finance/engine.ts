import {
  LedgerBook,
  paymentEntries,
  refundEntries,
  settlementCompleteEntries,
  settlementFailEntries,
  settlementReserveEntries,
  type PostedTx,
} from "./ledger.ts";
import { applyCommission, pickCommissionRule, type CommissionRule, type CommissionSnapshot } from "./commission.ts";

export type PaymentRecord = {
  id: string;
  bookingId: string;
  customerId: string;
  businessId: string;
  amountIrr: number;
  status: "created" | "pending" | "redirected" | "paid" | "failed" | "cancelled" | "refunded" | "partially_refunded";
  purpose: "deposit" | "full" | "booking";
  provider?: string;
  providerPaymentId?: string;
  idempotencyKey: string;
  snapshot?: CommissionSnapshot;
};

export class FinanceEngine {
  book = new LedgerBook();
  payments = new Map<string, PaymentRecord>();
  refunded = new Set<string>();
  settlements = new Map<string, { id: string; businessId: string; amountIrr: number; status: string; idempotencyKey: string }>();
  rules: CommissionRule[];

  constructor(rules: CommissionRule[]) {
    this.rules = rules;
  }

  createPayment(input: Omit<PaymentRecord, "status" | "snapshot"> & { status?: PaymentRecord["status"] }) {
    const existing = [...this.payments.values()].find((p) => p.idempotencyKey === input.idempotencyKey);
    if (existing) return existing;
    const rec: PaymentRecord = { ...input, status: input.status ?? "created" };
    this.payments.set(rec.id, rec);
    return rec;
  }

  markRedirected(id: string) {
    const p = this.must(id);
    if (p.status === "paid") return p;
    p.status = "redirected";
    return p;
  }

  /** Query-string callback must not mark paid. */
  applyBrowserCallback(_id: string, _queryPaid: boolean): never {
    throw new Error("callback مرورگر اثبات پرداخت نیست.");
  }

  verifyAndPost(id: string, providerStatus: "paid" | "failed", at = new Date()) {
    const p = this.must(id);
    if (p.status === "paid") return p;
    if (providerStatus !== "paid") {
      p.status = "failed";
      return p;
    }
    const rule = pickCommissionRule(this.rules, { businessId: p.businessId });
    const snapshot = applyCommission(p.amountIrr, rule, at);
    p.snapshot = snapshot;
    this.book.post({
      id: `tx-${p.id}`,
      kind: "payment_verified",
      idempotencyKey: `pay:${p.id}:verified`,
      paymentId: p.id,
      bookingId: p.bookingId,
      businessId: p.businessId,
      entries: paymentEntries({
        grossIrr: snapshot.grossIrr,
        commissionIrr: snapshot.commissionIrr,
        businessId: p.businessId,
        held: p.purpose === "deposit",
      }),
    });
    p.status = "paid";
    return p;
  }

  handleWebhook(eventId: string, paymentId: string, status: "paid" | "failed") {
    const key = `wh:${eventId}`;
    if (this.book.byIdem.has(key) || (this.payments.get(paymentId)?.status === "paid" && status === "paid")) {
      return this.must(paymentId);
    }
    return this.verifyAndPost(paymentId, status);
  }

  refund(id: string, amountIrr: number) {
    const p = this.must(id);
    if (p.status !== "paid") throw new Error("پرداخت قابل استرداد نیست.");
    if (amountIrr > p.amountIrr) throw new Error("مبلغ استرداد بیشتر از پرداخت است.");
    const key = `refund:${id}`;
    if (this.book.byIdem.has(key) || this.refunded.has(id)) throw new Error("استرداد تکراری");
    const commissionReturned = p.snapshot ? Math.floor((p.snapshot.commissionIrr * amountIrr) / p.amountIrr) : 0;
    this.book.post({
      id: `tx-refund-${id}`,
      kind: "refund",
      idempotencyKey: key,
      paymentId: id,
      businessId: p.businessId,
      entries: refundEntries({
        grossIrr: amountIrr,
        commissionReturnedIrr: commissionReturned,
        businessId: p.businessId,
        fromHeld: p.purpose === "deposit",
      }),
    });
    this.refunded.add(id);
    p.status = amountIrr === p.amountIrr ? "refunded" : "partially_refunded";
    return p;
  }

  requestSettlement(input: { id: string; businessId: string; amountIrr: number; idempotencyKey: string }) {
    const existing = [...this.settlements.values()].find((s) => s.idempotencyKey === input.idempotencyKey);
    if (existing) return existing;
    const available = this.book.settleable(input.businessId);
    if (input.amountIrr > available) throw new Error("مانده قابل تسویه کافی نیست.");
    this.book.post({
      id: `tx-set-${input.id}`,
      kind: "settlement_reserve",
      idempotencyKey: `set:${input.idempotencyKey}`,
      settlementId: input.id,
      businessId: input.businessId,
      entries: settlementReserveEntries(input.businessId, input.amountIrr),
    });
    const row = { ...input, status: "requested" };
    this.settlements.set(input.id, row);
    return row;
  }

  failSettlement(id: string) {
    const s = this.settlements.get(id);
    if (!s) throw new Error("تسویه پیدا نشد.");
    if (s.status === "failed" || s.status === "completed") return s;
    this.book.post({
      id: `tx-set-fail-${id}`,
      kind: "settlement_failed",
      idempotencyKey: `set-fail:${id}`,
      settlementId: id,
      businessId: s.businessId,
      entries: settlementFailEntries(s.businessId, s.amountIrr),
    });
    s.status = "failed";
    return s;
  }

  completeSettlement(id: string) {
    const s = this.settlements.get(id);
    if (!s) throw new Error("تسویه پیدا نشد.");
    if (s.status === "completed") return s;
    this.book.post({
      id: `tx-set-ok-${id}`,
      kind: "settlement_completed",
      idempotencyKey: `set-ok:${id}`,
      settlementId: id,
      businessId: s.businessId,
      entries: settlementCompleteEntries(s.businessId, s.amountIrr),
    });
    s.status = "completed";
    return s;
  }

  private must(id: string) {
    const p = this.payments.get(id);
    if (!p) throw new Error("پرداخت پیدا نشد.");
    return p;
  }
}

export function txBalance(tx: PostedTx) {
  return tx.entries.reduce((s, e) => s + e.debit - e.credit, 0);
}
