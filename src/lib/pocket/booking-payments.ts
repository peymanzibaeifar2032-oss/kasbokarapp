import type { PocketBooking } from "../pocket-book.ts";
import { appendCashEntry, type CashEntry } from "./cash-box.ts";

/** Same bounds as the site's addStudioPayment: integer Toman, 1 … 2,000,000,000. */
export const MAX_PAYMENT_TOMAN = 2_000_000_000;

/** Persian/Arabic/Latin digits with optional thousands separators. Anything else (minus, decimals, letters) is rejected. */
export function parsePaymentToman(input: string): number | null {
  const s = String(input ?? "")
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\s,٬،']/g, "")
    .trim();
  if (!/^\d{1,10}$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_PAYMENT_TOMAN) return null;
  return n;
}

/** Phone-recorded payments for exactly this booking (by stable local id, never by name or phone). */
export function bookingLocalPayments(row: Pick<PocketBooking, "id">, entries: CashEntry[]) {
  return entries.filter((e) => e.bookingId === row.id && !e.serverId && e.kind === "income");
}

/**
 * Site formula (tattooBalance): remaining = max(0, price − paid); settled when price>0 and paid ≥ price.
 * Overpayment is NOT rejected by the site, so it is allowed here and reported as `overpaid`.
 * sitePaid comes from the site export (sum of tattoo_payments); localPaid are phone-only rows not yet on the site.
 */
export function bookingTotals(row: PocketBooking, entries: CashEntry[]) {
  const price = Math.max(0, Number(row.server?.priceMinToman) || Number(row.priceToman) || 0);
  const sitePaid = Math.max(0, Number(row.server?.paidToman) || 0);
  const local = bookingLocalPayments(row, entries);
  const localPaid = local.reduce((sum, e) => sum + e.amountToman, 0);
  const paid = sitePaid + localPaid;
  return { price, sitePaid, localPaid, paid, remaining: Math.max(0, price - paid), settled: price > 0 && paid >= price, overpaid: Math.max(0, paid - price), local };
}

export function newPaymentId() {
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `bpay-${rnd}`;
}

/**
 * Records one deposit for one booking as ONE cash-box income row (so the cash total moves exactly once and
 * the booking's paid/remaining are derived from the same row). License gate + single transaction live in appendCashEntry.
 * Returns false if this draft id was already saved (double tap).
 */
export async function recordBookingPayment(
  row: PocketBooking,
  input: { id: string; amountToman: number; note?: string; day: string; now?: string },
) {
  if (!Number.isSafeInteger(input.amountToman) || input.amountToman < 1 || input.amountToman > MAX_PAYMENT_TOMAN) throw new Error("مبلغ معتبر نیست.");
  const entry: CashEntry = {
    id: input.id,
    day: input.day,
    kind: "income",
    title: `واریز ${row.name}`.slice(0, 400),
    amountToman: input.amountToman,
    note: (input.note ?? "").trim().slice(0, 200),
    createdAt: input.now ?? new Date().toISOString(),
    bookingId: row.id,
    ...(row.serverId ? { bookingServerId: row.serverId } : {}),
  };
  const saved = await appendCashEntry(entry);
  return { saved, entry };
}
