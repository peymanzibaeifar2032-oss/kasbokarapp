import assert from "node:assert/strict";
import { test, before } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { indexedDB } from "fake-indexeddb";
import { PGlite } from "@electric-sql/pglite";
import { parsePocketSnapshot, parseFinance, parseTraining } from "./sync-response.ts";
import { applyServerFinance, listCashEntries, readServerCashSummary, saveCashEntries } from "./cash-box.ts";
import { parsePocketBackup, mergeBackup, commitBackup, currentBackup } from "./backup.ts";
import { applyDownload } from "../pocket-book.ts";
import { exportPocketBookings } from "../server/pocket-bookings-export.ts";
import { exportPocketTrainees } from "../server/pocket-trainees-export.ts";
import { exportPocketFinance } from "../server/pocket-finance-export.ts";

// Integration: the app's parser + local stores fed with what the REAL server export functions return from
// the REAL schema (all repo migrations). Rows are synthetic fixtures, never user data.
Object.assign(globalThis, { indexedDB });
const root = process.cwd();
let snapshot: Record<string, unknown>;

before(async () => {
  const db = new PGlite();
  for (const f of readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql")).sort())
    await db.exec(readFileSync(join(root, "migrations", f), "utf8"));
  const sql = { query: async <T>(q: string, p: unknown[]) => (await db.query(q, p as unknown[])).rows as T[] };
  await db.exec(`
    insert into tattoo_requests (id, customer_id, customer_name, customer_phone, request_type, style, idea, placement, size_cm,
      status, price_min_toman, paid_toman, deposit_toman, session_count, proposed_slot_start, tracking_code)
    values ('r1','c','مشتری','09120000001','new','s','i','p','10','booked',4000000,1500000,500000,2,'2026-11-10T10:30:00Z','T1');
    insert into tattoo_payments (id, request_id, amount_toman, note, created_at)
      values ('p1','r1',500000,'بیعانه','2026-11-05T08:00:00Z'), ('p2','r1',1000000,null,'2026-11-06T08:00:00Z');
    insert into studio_expenses (id, user_id, category, title, amount_toman, month_jy, month_jm) values ('e1','o','rent','اجاره',700000,1405,8);
    insert into studio_apprentices (id, user_id, slug, name, phone, session_goal, sessions_done, debt_toman)
      values ('a1','o','a','هنرجو','09',0,3,200000);
    insert into studio_apprentice_payments (id, user_id, apprentice_id, amount_toman, paid_on) values ('x','o','a1',300000,'2026-11-01');`);
  snapshot = JSON.parse(
    JSON.stringify({
      schemaVersion: 2,
      account: { isOwner: true, canViewAppStats: false, accountEmail: "owner@example.com" },
      ...(await exportPocketTrainees(sql, "o")),
      finance: await exportPocketFinance(sql, "o", { month: 2500000, all: 2500000 }, new Date("2026-11-07T09:00:00Z")),
      bookings: await exportPocketBookings(sql),
    }),
  );
});

test("server export → app parser: paid/remaining, trainees with sessions/payments, finance ok", () => {
  const r = parsePocketSnapshot(200, snapshot);
  const b = r.bookings[0].server!;
  assert.equal(b.paidToman, 1500000);
  assert.equal(b.priceMinToman - b.paidToman, 2500000);
  assert.equal(r.training?.trainees[0].sessionsDone, 3);
  assert.equal(r.training?.traineePayments[0].amountToman, 300000);
  assert.equal(r.finance.state, "ok");
});

test("cash box is non-zero after sync and survives a JSON export/import roundtrip without duplicates", async () => {
  const r = parsePocketSnapshot(200, snapshot);
  assert.equal(r.finance.state, "ok");
  if (r.finance.state !== "ok") return;
  await applyServerFinance(r.finance.data);
  const cash = await listCashEntries();
  const income = cash.filter((c) => c.kind === "income").reduce((s, c) => s + c.amountToman, 0);
  const expense = cash.filter((c) => c.kind === "expense").reduce((s, c) => s + c.amountToman, 0);
  assert.equal(income, 1500000);
  assert.equal(expense, 700000);
  assert.equal((await readServerCashSummary())?.summary.balanceToman, 800000);

  const bookings = applyDownload([], r.bookings);
  const file = JSON.stringify(await currentBackup(bookings, { locale: "fa", professionId: "tattoo", onboarded: true }));
  assert.ok(!/"(isOwner|accountEmail|canViewAppStats|cookie|token|password)"/i.test(file), "no auth/role data in the file");
  const parsed = parsePocketBackup(file);
  assert.equal(parsed.cashEntries?.length, 3);
  await saveCashEntries([]);
  const before = await currentBackup(bookings, { locale: "fa", professionId: "tattoo", onboarded: true });
  await commitBackup(mergeBackup(before, parsed), before);
  await commitBackup(mergeBackup(await currentBackup(bookings, before.settings!), parsed), before);
  assert.equal((await listCashEntries()).length, 3, "re-import does not duplicate");
});

test("malformed file never touches local data; old v2 file leaves cash untouched", async () => {
  const count = (await listCashEntries()).length;
  assert.throws(() => parsePocketBackup('{"schemaVersion":3,"bookings":[],"cashEntries":[{"id":"x","day":"bad"}]}'));
  assert.equal((await listCashEntries()).length, count);
  const old = parsePocketBackup({ schemaVersion: 2, bookings: [], trainees: [], traineePayments: [] });
  assert.equal(old.cashEntries, undefined);
  const before = await currentBackup([], { locale: "fa", professionId: "tattoo", onboarded: true });
  await commitBackup(mergeBackup(before, old), before);
  assert.equal((await listCashEntries()).length, count);
});

test("one odd row never hides the whole ledger / roster; missing vs error vs zero stay distinct", () => {
  const fin = snapshot.finance as { records: unknown[] };
  const f = parseFinance({ finance: { ...fin, records: [...fin.records, { serverId: "bad id", kind: "income" }] } });
  assert.equal(f.state, "ok");
  if (f.state === "ok") {
    assert.equal(f.skipped, 1);
    assert.equal(f.data.records.length, 3);
  }
  assert.equal(parseFinance({}).state, "unavailable");
  assert.equal(parseFinance({ finance: null, financeError: "x" }).state, "error");
  assert.equal(parseFinance({ finance: { records: "nope" } }).state, "invalid");
  const t = parseTraining([{ id: "t1", name: "a", sessionGoal: 0 }, { id: "" }], [{ id: "p", traineeId: "ghost", amountToman: 1, paidOn: "1405-08-01" }]);
  assert.equal(t.trainees.length, 1);
  assert.equal(t.skipped, 2);
});

test("bad optional booking detail does not abort the sync", () => {
  const rows = (snapshot.bookings as Record<string, unknown>[]).map((b) => ({ ...b, phone2: "9".repeat(99) }));
  const r = parsePocketSnapshot(200, { ...snapshot, bookings: rows });
  assert.equal(r.bookings[0].server?.paidToman, 1500000);
  assert.equal(r.bookings[0].server?.phone2, "");
});

test("JSON import/export lives in exactly one place (backup tab)", () => {
  const app = readFileSync(join(root, "src/components/pocket/app.tsx"), "utf8");
  assert.equal(app.match(/<PocketBackupPanel/g)?.length, 1);
  assert.ok(app.includes('ready && tab === "backup" ? (\n          <PocketBackupPanel'));
  for (const f of ["cash-panel.tsx", "trainees-panel.tsx", "stats-panel.tsx", "booking-actions.tsx"]) {
    const src = readFileSync(join(root, "src/components/pocket", f), "utf8");
    assert.ok(!/application\/json|Import JSON|وارد کردن JSON/.test(src), f);
  }
});
