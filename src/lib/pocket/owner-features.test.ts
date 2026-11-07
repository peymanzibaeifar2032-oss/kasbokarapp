import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { parsePocketAccess, parsePocketSnapshot } from "./sync-response.ts";
import { mergeServerCash, type CashEntry, type ServerFinanceInput } from "./cash-box.ts";
import { applyDownload, type PocketBooking } from "../pocket-book.ts";
import { plainSmsLink, studioPanelUrl, usablePhone, STUDIO_PANEL_TABS } from "./booking-links.ts";
import { exportPocketFinance, tehranJalaliDay } from "../server/pocket-finance-export.ts";

const booking = {
  serverId: "req-1",
  day: "1405-08-16",
  time: "10:30",
  name: "سارا",
  phone: "09120000000",
  style: "مینیمال",
  placement: "مچ",
  phone2: "09350000000",
  instagram: "sara.ink",
  sizeCm: "8x5",
  requestType: "new",
  idea: "گل",
  priceMinToman: 3000000,
  priceMaxToman: 4000000,
  depositToman: 500000,
  paidToman: 1000000,
  sessionCount: 1,
  sessionMinutes: 120,
  bookingId: "bk-1",
  slotStart: "2026-11-07T07:00:00.000Z",
};
const finance = {
  status: "ok",
  generatedAt: "2026-11-06T10:00:00.000Z",
  truncated: false,
  records: [
    { serverId: "pay:p1", kind: "income", day: "1405-08-10", amountToman: 1000000, title: "سارا", note: "", category: "tattoo_payment", ref: "مینیمال · مچ" },
    { serverId: "exp:e1", kind: "expense", day: "1405-08-01", amountToman: 400000, title: "اجاره", note: "", category: "کرایه سالن", ref: "" },
  ],
  summary: { incomeToman: 1000000, expenseToman: 400000, balanceToman: 600000, openReceivableToman: 2000000 },
  currentMonth: { jy: 1405, jm: 8, paid: 1000000, remainingMonth: 2000000, remainingAll: 2000000, salonCost: 400000, lifeCost: 0, expenseTotal: 400000, salonProfit: 600000, leftover: 600000 },
};
const stats = { installs: 3, downloads: 9, accounts: [], monthlyRevenue: [] };

test("owner export: verified flags, real booking details, finance and stats are parsed strictly", () => {
  const snap = parsePocketSnapshot(200, {
    schemaVersion: 2,
    account: { isOwner: true, canViewAppStats: true, accountEmail: "owner@example.com" },
    bookings: [booking],
    finance,
    appStats: stats,
  });
  assert.equal(snap.account?.isOwner, true);
  assert.equal(snap.bookings[0].server?.sizeCm, "8x5");
  assert.equal(snap.bookings[0].server?.phone2, "09350000000");
  assert.equal(snap.finance.state, "ok");
  assert.deepEqual(snap.appStats, stats);
});

test("missing/forged account flags never unlock owner UI or stats", () => {
  const legacy = parsePocketSnapshot(200, { bookings: [] });
  assert.equal(legacy.account, null);
  assert.equal(legacy.appStats, null);
  assert.equal(legacy.finance.state, "unavailable");
  const forged = parsePocketSnapshot(200, { bookings: [], account: { isOwner: "yes" }, appStats: stats });
  assert.equal(forged.account, null);
  assert.equal(forged.appStats, null);
  const noStats = parsePocketSnapshot(200, { bookings: [], account: { isOwner: true, canViewAppStats: false, accountEmail: "" }, appStats: stats });
  assert.equal(noStats.appStats, null);
  assert.deepEqual(parsePocketAccess(401, {}), { account: null, appStats: null });
  assert.deepEqual(parsePocketAccess(0, undefined), { account: null, appStats: null });
  const regular = parsePocketAccess(200, { account: { isOwner: false, canViewAppStats: true, accountEmail: "u@x.com" }, appStats: stats });
  assert.equal(regular.account?.canViewAppStats, false);
  assert.equal(regular.appStats, null);
});

test("invalid finance rows are skipped and counted (never applied); bad booking details fall back to defaults", () => {
  const bad = parsePocketSnapshot(200, {
    bookings: [],
    account: { isOwner: true, canViewAppStats: false, accountEmail: "" },
    finance: { ...finance, records: [{ ...finance.records[0], amountToman: -5 }] },
  });
  assert.equal(bad.finance.state, "ok");
  assert.equal(bad.finance.state === "ok" && bad.finance.data.records.length, 0);
  assert.equal(bad.finance.state === "ok" && bad.finance.skipped, 1);
  const dup = parsePocketSnapshot(200, { bookings: [], finance: { ...finance, records: [finance.records[0], finance.records[0]] } });
  assert.equal(dup.finance.state === "ok" && dup.finance.data.records.length, 1);
  assert.equal(parsePocketSnapshot(200, { bookings: [], finance: { ...finance, summary: null } }).finance.state, "invalid");
  const free = parsePocketSnapshot(200, { bookings: [{ ...booking, priceMinToman: "free" }] });
  assert.equal(free.bookings[0].server?.priceMinToman, 0);
});

test("server cash merge keeps manual rows, never duplicates, drops stale server rows", () => {
  const manual: CashEntry = { id: "cash-1", day: "1405-08-10", kind: "income", title: "دستی", amountToman: 1000000, note: "", createdAt: "x" };
  const once = mergeServerCash([manual], finance as ServerFinanceInput);
  const twice = mergeServerCash(once, finance as ServerFinanceInput);
  assert.equal(twice.length, 3);
  assert.equal(twice.filter((r) => r.serverId === "pay:p1").length, 1);
  assert.ok(twice.some((r) => r.id === "cash-1"));
  const shrunk = mergeServerCash(twice, { ...(finance as ServerFinanceInput), records: [finance.records[1] as ServerFinanceInput["records"][0]] });
  assert.equal(shrunk.length, 2);
  assert.ok(!shrunk.some((r) => r.serverId === "pay:p1"));
  const truncated = mergeServerCash(twice, { ...(finance as ServerFinanceInput), truncated: true, records: [] });
  assert.equal(truncated.length, 3);
});

test("download stores real site facts and refreshes them on locally edited (pinned) rows", () => {
  const snap = parsePocketSnapshot(200, { bookings: [booking] });
  const first = applyDownload([], snap.bookings);
  assert.equal(first[0].server?.bookingId, "bk-1");
  assert.equal(first[0].sizeCm, "8x5");
  const pinned: PocketBooking[] = [{ ...first[0], note: "یادداشت من", pinned: true, server: undefined }];
  const again = applyDownload(pinned, snap.bookings);
  assert.equal(again.length, 1);
  assert.equal(again[0].note, "یادداشت من");
  assert.equal(again[0].server?.phone2, "09350000000");
});

test("action links: only tel/sms composers and real https panel routes", () => {
  assert.equal(plainSmsLink("۰۹۱۲ ۰۰۰ ۰۰۰۰"), "sms:09120000000");
  assert.equal(plainSmsLink("123"), null);
  assert.equal(usablePhone("12"), "");
  const admin = readFileSync("src/routes/studio.admin.tsx", "utf8");
  for (const tab of STUDIO_PANEL_TABS) {
    assert.ok(admin.includes(`"${tab}"`), tab);
    assert.match(studioPanelUrl(tab), /^https:\/\/kasbokarapp\.com\/studio\/admin\?tab=/);
  }
  const format = readFileSync("src/lib/format.ts", "utf8");
  assert.ok(format.includes("https://wa.me/"), "WhatsApp is offered only because the site already offers it");
  const main = readFileSync(
    "android-tattoo-booking/app/src/main/java/com/peymanzibaeifar/tattoobooking/MainActivity.java",
    "utf8",
  );
  assert.ok(main.includes("private void openExternalSafely"));
  assert.ok(main.includes("Intent.ACTION_DIAL"));
  assert.ok(!/startActivity\(new Intent\(Intent\.ACTION_VIEW, uri\)\)/.test(main), "no raw ACTION_VIEW of arbitrary page URIs");
});

test("owner/stats UI is gated by server response only, never by typed email or storage", () => {
  const app = readFileSync("src/components/pocket/app.tsx", "utf8");
  assert.ok(!app.includes("isStudioOwnerEmail"));
  assert.ok(app.includes('tab === "stats" && canViewStats'));
  assert.ok(!/localStorage[^\n]*(isOwner|canViewAppStats)/.test(app));
  const writes = readFileSync("src/lib/server/writes.ts", "utf8");
  const exp = writes.slice(writes.indexOf("async function performStudioPocketExport"));
  assert.ok(exp.indexOf("requireStudioStaff(userId)") < exp.indexOf("sql.query"));
  assert.ok(exp.indexOf('actor.role !== "owner"') < exp.indexOf("sql.query"));
  assert.match(writes, /case "studioPocketAccess":\n\s+return performStudioPocketAccess\(userId\);/);
});

test("finance export: owner-scoped read-only selects mapped from real tables, no synthetic rows", async () => {
  const seen: { q: string; p: unknown[] }[] = [];
  const sql = {
    query: async <T>(q: string, p: unknown[]): Promise<T[]> => {
      seen.push({ q, p });
      assert.ok(q.trim().startsWith("select"));
      if (q.includes("from tattoo_payments"))
        return [{ id: "p1", request_id: "r1", amount_toman: "250000", note: "کارت", created_at: "2026-11-05T21:00:00Z", customer_name: "علی", style: "لاین", placement: "بازو" }] as T[];
      return [
        { id: "e1", category: "salon_rent", title: "اجاره", amount_toman: 900000, month_jy: 1405, month_jm: 8, note: null, created_at: "2026-10-23T00:00:00Z" },
        { id: "e2", category: "pocket", title: "خرج", amount_toman: 50000, month_jy: 1405, month_jm: 8, note: "daily:10000x5", created_at: "2026-10-23T00:00:00Z" },
      ] as T[];
    },
  };
  const out = await exportPocketFinance(sql, "owner-1", { month: 100, all: 300 }, new Date("2026-11-06T08:00:00Z"));
  assert.deepEqual(seen[1].p, ["owner-1"]);
  assert.ok(seen[1].q.includes("user_id=$1"));
  assert.equal(out.records.length, 3);
  assert.equal(out.records[0].day, tehranJalaliDay("2026-11-05T21:00:00Z"));
  assert.equal(out.summary.balanceToman, 250000 - 950000);
  assert.equal(out.currentMonth.salonCost, 900000);
  assert.equal(out.currentMonth.lifeCost, 50000);
  assert.equal(out.summary.openReceivableToman, 300);
  const empty = await exportPocketFinance({ query: async <T>() => [] as T[] }, "owner-1", { month: 0, all: 0 });
  assert.equal(empty.records.length, 0);
  assert.equal(empty.summary.incomeToman, 0);
});
