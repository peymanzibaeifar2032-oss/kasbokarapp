import assert from "node:assert/strict";
import { test } from "node:test";
import { indexedDB } from "fake-indexeddb";
(globalThis as { indexedDB?: IDBFactory }).indexedDB = indexedDB;
const { listPocketBookings, savePocketBookings } = await import("../pocket-book.ts");
const { listCashEntries, saveCashEntries } = await import("./cash-box.ts");

const base = {
  day: "1405-08-21",
  time: "10:00",
  name: "ردیف واقعی آزمون",
  phone: "",
  style: "",
  placement: "",
  note: "",
  priceToman: 0,
  pinned: true,
  serverId: null,
};

test("a failing bulk save never commits the clear(): old bookings survive", async () => {
  await savePocketBookings([{ ...base, id: "keep-1" }, { ...base, id: "keep-2" }]);
  const broken = [{ ...base, id: "new-1" }, { ...base, id: "bad", photo: (() => 1) as unknown as string }];
  await assert.rejects(() => savePocketBookings(broken));
  const rows = await listPocketBookings();
  assert.deepEqual(rows.map((r) => r.id).sort(), ["keep-1", "keep-2"]);
});

test("rows with missing optional text never crash sorting", async () => {
  await savePocketBookings([{ ...base, id: "a", time: undefined as unknown as string, name: undefined as unknown as string }, { ...base, id: "b" }]);
  const rows = await listPocketBookings();
  assert.equal(rows.length, 2);
});

test("a failing cash box rewrite keeps the previous box", async () => {
  const row = { id: "cash-1", day: "1405-08-21", kind: "income" as const, title: "واریز", amountToman: 1000, note: "", createdAt: "2026-11-12T00:00:00Z" };
  await saveCashEntries([row]);
  await assert.rejects(() => saveCashEntries([{ ...row, id: "cash-2", note: (() => 1) as unknown as string }]));
  assert.deepEqual((await listCashEntries()).map((r) => r.id), ["cash-1"]);
});
