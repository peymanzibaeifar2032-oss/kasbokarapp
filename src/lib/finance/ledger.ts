import { assertInt } from "./money.ts";

export type LedgerSide = { account: string; partyId?: string | null; debit: number; credit: number };

export type PostedTx = {
  id: string;
  kind: string;
  idempotencyKey: string;
  bookingId?: string | null;
  paymentId?: string | null;
  settlementId?: string | null;
  businessId?: string | null;
  memo?: string | null;
  entries: LedgerSide[];
};

export function assertBalanced(entries: LedgerSide[]) {
  let debit = 0;
  let credit = 0;
  for (const e of entries) {
    assertInt(e.debit, "debit");
    assertInt(e.credit, "credit");
    if (e.debit > 0 && e.credit > 0) throw new Error("entry cannot debit and credit");
    if (e.debit === 0 && e.credit === 0) throw new Error("empty entry");
    debit += e.debit;
    credit += e.credit;
  }
  if (debit !== credit) throw new Error(`unbalanced ledger ${debit} != ${credit}`);
}

export class LedgerBook {
  txs = new Map<string, PostedTx>();
  byIdem = new Map<string, PostedTx>();

  post(tx: PostedTx): PostedTx {
    const existing = this.byIdem.get(tx.idempotencyKey);
    if (existing) return existing;
    assertBalanced(tx.entries);
    this.txs.set(tx.id, tx);
    this.byIdem.set(tx.idempotencyKey, tx);
    return tx;
  }

  balance(account: string, partyId?: string | null) {
    let n = 0;
    for (const tx of this.txs.values()) {
      for (const e of tx.entries) {
        if (e.account !== account) continue;
        if (partyId !== undefined && (e.partyId ?? null) !== (partyId ?? null)) continue;
        n += e.debit - e.credit;
      }
    }
    return n;
  }

  /** Liability accounts (payable) are credit-normal: available = -balance. */
  payable(businessId: string) {
    return -this.balance("business_payable", businessId);
  }

  reservedSettlement(businessId: string) {
    return -this.balance("settlement_clearing", businessId);
  }

  settleable(businessId: string) {
    return this.payable(businessId);
  }
}

export function paymentEntries(opts: {
  grossIrr: number;
  commissionIrr: number;
  providerFeeIrr?: number;
  businessId: string;
  held?: boolean;
}): LedgerSide[] {
  const fee = opts.providerFeeIrr ?? 0;
  const net = opts.grossIrr - opts.commissionIrr - fee;
  if (net < 0) throw new Error("commission exceeds gross");
  const creditAccount = opts.held ? "deposit_held" : "business_payable";
  const entries: LedgerSide[] = [{ account: "customer_clearing", debit: opts.grossIrr, credit: 0 }];
  if (net > 0) entries.push({ account: creditAccount, partyId: opts.businessId, debit: 0, credit: net });
  if (opts.commissionIrr > 0) entries.push({ account: "platform_commission", debit: 0, credit: opts.commissionIrr });
  if (fee) entries.push({ account: "provider_clearing", debit: 0, credit: fee });
  return entries;
}

export function settlementReserveEntries(businessId: string, amountIrr: number): LedgerSide[] {
  return [
    { account: "business_payable", partyId: businessId, debit: amountIrr, credit: 0 },
    { account: "settlement_clearing", partyId: businessId, debit: 0, credit: amountIrr },
  ];
}

export function settlementCompleteEntries(businessId: string, amountIrr: number): LedgerSide[] {
  return [
    { account: "settlement_clearing", partyId: businessId, debit: amountIrr, credit: 0 },
    { account: "provider_clearing", debit: 0, credit: amountIrr },
  ];
}

export function settlementFailEntries(businessId: string, amountIrr: number): LedgerSide[] {
  return [
    { account: "settlement_clearing", partyId: businessId, debit: amountIrr, credit: 0 },
    { account: "business_payable", partyId: businessId, debit: 0, credit: amountIrr },
  ];
}

export function refundEntries(opts: {
  grossIrr: number;
  commissionReturnedIrr: number;
  businessId: string;
  fromHeld?: boolean;
}): LedgerSide[] {
  const fromBiz = opts.grossIrr - opts.commissionReturnedIrr;
  const source = opts.fromHeld ? "deposit_held" : "business_payable";
  const entries: LedgerSide[] = [];
  if (fromBiz > 0) entries.push({ account: source, partyId: opts.businessId, debit: fromBiz, credit: 0 });
  if (opts.commissionReturnedIrr > 0) entries.push({ account: "platform_commission", debit: opts.commissionReturnedIrr, credit: 0 });
  entries.push({ account: "refund_liability", debit: 0, credit: opts.grossIrr });
  return entries;
}
