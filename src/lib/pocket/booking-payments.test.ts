import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { indexedDB, IDBFactory } from "fake-indexeddb";
import { bookingTotals, parsePaymentToman, recordBookingPayment } from "./booking-payments.ts";
import { listCashEntries, saveCashEntries, summarizeCash, applyServerFinance } from "./cash-box.ts";
import { parsePocketBackup, mergeBackup } from "./backup.ts";
import { applyDownload, type PocketBooking } from "../pocket-book.ts";
import { setLicenseChecker } from "./license-gate.ts";

// Synthetic fixtures only. Each test gets a fresh in-memory IndexedDB.
Object.assign(globalThis, { indexedDB });
beforeEach(() => {
  Object.assign(globalThis, { indexedDB: new IDBFactory(), __POCKET_LICENSE_ENFORCED__: false });
  setLicenseChecker(null);
});

const server = (paid: number, price: number) => ({
  phone2: "", instagram: "", sizeCm: "", requestType: "new", idea: "", priceMinToman: price, priceMaxToman: price,
  depositToman: 500000, paidToman: paid, sessionCount: 1, sessionMinutes: 120, bookingId: "b1", slotStart: "",
});
const siteRow = (): PocketBooking => ({ id: "srv-r1", day: "1405-08-20", name: "مشتری", phone: "09120000001", style: "", placement: "", time: "14:00", note: "", serverId: "r1", pinned: false, server: server(1_500_000, 4_000_000) });

test("amount parser: Persian/Arabic digits and separators; rejects zero, negative, decimals, junk, > 2e9", () => {
  assert.equal(parsePaymentToman("۵۰۰٬۰۰۰"), 500000);
  assert.equal(parsePaymentToman("٥٠٠,٠٠٠"), 500000);
  assert.equal(parsePaymentToman(" 500 000 "), 500000);
  for (const bad of ["", "0", "۰", "-5", "5.5", "abc", "1e6", "2000000001", "NaN"]) assert.equal(parsePaymentToman(bad), null, bad);
  assert.equal(parsePaymentToman("2000000000"), 2_000_000_000);
});

test("paid 1.5M of 4M + 0.5M → paid 2M, remaining 2M; cash +0.5M exactly once; double tap is a no-op", async () => {
  const row = siteRow();
  assert.deepEqual([bookingTotals(row, []).paid, bookingTotals(row, []).remaining], [1_500_000, 2_500_000]);
  await saveCashEntries([{ id: "m1", day: "1405-08-01", kind: "income", title: "دستی", amountToman: 100, note: "", createdAt: "x" }]);
  const before = summarizeCash(await listCashEntries()).income;
  const a = recordBookingPayment(row, { id: "bpay-1", amountToman: 500_000, day: "1405-08-16" });
  const b = recordBookingPayment(row, { id: "bpay-1", amountToman: 500_000, day: "1405-08-16" });
  const [ra, rb] = await Promise.all([a, b]);
  assert.equal([ra.saved, rb.saved].filter(Boolean).length, 1, "exactly one write for one draft id");
  const cash = await listCashEntries();
  assert.equal(summarizeCash(cash).income - before, 500_000);
  const t = bookingTotals(row, cash);
  assert.deepEqual([t.paid, t.remaining, t.localPaid, t.sitePaid], [2_000_000, 2_000_000, 500_000, 1_500_000]);
  assert.equal(cash.find((e) => e.id === "bpay-1")?.bookingServerId, "r1");
});

test("same-name customers stay isolated (linked by booking id, not name/phone)", async () => {
  const a: PocketBooking = { ...siteRow(), id: "local-a", serverId: null, server: undefined, priceToman: 1_000_000 };
  const b: PocketBooking = { ...a, id: "local-b" };
  await recordBookingPayment(a, { id: "bpay-a", amountToman: 300_000, day: "1405-08-16" });
  const cash = await listCashEntries();
  assert.equal(bookingTotals(a, cash).paid, 300_000);
  assert.equal(bookingTotals(b, cash).paid, 0);
  assert.equal(bookingTotals(a, cash).remaining, 700_000);
});

test("overpayment follows the site: allowed, remaining clamps to 0, settled", async () => {
  const row = siteRow();
  await recordBookingPayment(row, { id: "bpay-o", amountToman: 3_000_000, day: "1405-08-16" });
  const t = bookingTotals(row, await listCashEntries());
  assert.deepEqual([t.paid, t.remaining, t.settled, t.overpaid], [4_500_000, 0, true, 500_000]);
});

test("license failure: nothing is written", async () => {
  Object.assign(globalThis, { __POCKET_LICENSE_ENFORCED__: true });
  setLicenseChecker(() => ({ ok: false, reason: "منقضی" }));
  await assert.rejects(recordBookingPayment(siteRow(), { id: "bpay-x", amountToman: 1, day: "1405-08-16" }), (e: { locked?: boolean }) => e.locked === true);
  Object.assign(globalThis, { __POCKET_LICENSE_ENFORCED__: false });
  assert.equal((await listCashEntries()).length, 0);
});

test("storage failure: error, no partial change", async () => {
  await saveCashEntries([{ id: "m1", day: "1405-08-01", kind: "income", title: "دستی", amountToman: 100, note: "", createdAt: "x" }]);
  const real = globalThis.indexedDB;
  Object.assign(globalThis, { indexedDB: { open: () => { throw new Error("QuotaExceededError"); } } });
  await assert.rejects(recordBookingPayment(siteRow(), { id: "bpay-q", amountToman: 5, day: "1405-08-16" }));
  Object.assign(globalThis, { indexedDB: real });
  assert.deepEqual((await listCashEntries()).map((e) => e.id), ["m1"]);
  await assert.rejects(recordBookingPayment(siteRow(), { id: "bpay-n", amountToman: Number.NaN, day: "1405-08-16" }));
  await assert.rejects(recordBookingPayment(siteRow(), { id: "bpay-z", amountToman: 0, day: "1405-08-16" }));
});

test("site reload keeps the pending phone payment; booking keeps its id; server cash rows never replace it", async () => {
  const row = siteRow();
  await recordBookingPayment(row, { id: "bpay-p", amountToman: 500_000, day: "1405-08-16" });
  await applyServerFinance({
    generatedAt: "t", truncated: false,
    summary: { incomeToman: 1_500_000, expenseToman: 0, balanceToman: 1_500_000, openReceivableToman: 0 },
    currentMonth: { jy: 1405, jm: 8, paid: 0, remainingMonth: 0, remainingAll: 0, salonCost: 0, lifeCost: 0, expenseTotal: 0, salonProfit: 0, leftover: 0 },
    records: [{ serverId: "p1", kind: "income", day: "1405-08-10", amountToman: 1_500_000, title: "واریز", note: "", category: "", ref: "r1" }],
  });
  const next = applyDownload([row], [{ serverId: "r1", day: row.day, time: row.time, name: row.name, phone: row.phone, style: "", placement: "", server: server(1_500_000, 4_000_000) } as never]);
  assert.equal(next[0].id, "srv-r1");
  const cash = await listCashEntries();
  assert.ok(cash.some((e) => e.id === "bpay-p"));
  assert.equal(bookingTotals(next[0], cash).paid, 2_000_000);
});

test("JSON backup keeps the payment link; importing the same file twice never double counts", async () => {
  const row = siteRow();
  const { entry } = await recordBookingPayment(row, { id: "bpay-j", amountToman: 500_000, day: "1405-08-16" });
  const file = JSON.stringify({ format: "kasbokar-pocket", schemaVersion: 3, exportedAt: "x", bookings: [row], trainees: [], traineePayments: [], cashEntries: [entry] });
  const parsed = parsePocketBackup(file);
  assert.equal(parsed.cashEntries?.[0].bookingId, "srv-r1");
  const local = { ...parsed, cashEntries: [entry] };
  const once = mergeBackup(local, parsed);
  const twice = mergeBackup(once, parsePocketBackup(file));
  assert.equal(twice.cashEntries?.filter((e) => e.id === "bpay-j").length, 1);
  assert.equal(bookingTotals(row, twice.cashEntries ?? []).paid, 2_000_000);
  // old file without the new fields still imports
  const old = parsePocketBackup(JSON.stringify({ schemaVersion: 3, bookings: [], cashEntries: [{ id: "c", day: "1405-08-01", kind: "income", title: "t", amountToman: 1, note: "", createdAt: "" }] }));
  assert.equal(old.cashEntries?.[0].bookingId, undefined);
});
