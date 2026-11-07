import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { exportPocketBookings } from "./pocket-bookings-export.ts";
import { exportPocketTrainees } from "./pocket-trainees-export.ts";
import { exportPocketFinance } from "./pocket-finance-export.ts";

// Contract test against the REAL schema: every repo migration is applied, then panel-shaped rows are
// inserted the way the site writes them. Fixture values are synthetic test data, not user data.
const root = process.cwd();
let db: PGlite;
const sql = {
  query: async <T>(q: string, params: unknown[]) => (await db.query(q, params as unknown[])).rows as T[],
};

before(async () => {
  db = new PGlite();
  for (const f of readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(root, "migrations", f), "utf8"));
  }
  await db.exec(`
    insert into tattoo_requests (id, customer_id, customer_name, customer_phone, customer_phone_2, customer_instagram,
      request_type, style, idea, placement, size_cm, status, price_min_toman, price_max_toman, session_count,
      session_minutes, deposit_toman, paid_toman, proposed_slot_start, tracking_code)
    values
      ('r1','c1','مشتری یک','09120000001','09120000002','ink.one','new','fine line','گل','ساعد','10x5','booked',
       4000000,5000000,2,180,500000,1500000,'2026-11-10T10:30:00Z','T1'),
      ('r2','c2','در انتظار','09120000003',null,null,'new','x','y','z','1','submitted',1,1,1,1,0,0,'2026-11-10T10:30:00Z','T2');
    insert into tattoo_payments (id, request_id, amount_toman, note, created_at)
      values ('p1','r1',500000,'بیعانه','2026-11-05T08:00:00Z'), ('p2','r1',1000000,null,'2026-11-06T08:00:00Z');
    insert into studio_expenses (id, user_id, category, title, amount_toman, month_jy, month_jm, note)
      values ('e1','owner','rent','اجاره',700000,1405,8,null), ('e2','someone-else','rent','x',1,1405,8,null);
    insert into studio_apprentices (id, user_id, slug, name, phone, session_goal, sessions_done, debt_toman)
      values ('a1','owner','a1','هنرجو','0912',12,5,300000), ('a2','someone-else','a2','دیگری','0913',1,1,0);
    insert into studio_apprentice_payments (id, user_id, apprentice_id, amount_toman, paid_on, note)
      values ('ap1','owner','a1',200000,'2026-11-06','شهریه');
  `);
});

describe("pocket owner export contract (real migrations)", () => {
  it("bookings carry panel paid / remaining / sessions / contacts", async () => {
    const rows = await exportPocketBookings(sql);
    assert.equal(rows.length, 1, "only status=booked jobs");
    const r = rows[0];
    assert.equal(r.paidToman, 1500000);
    assert.equal(r.remainingToman, 2500000);
    assert.equal(r.depositToman, 500000);
    assert.equal(r.sessionCount, 2);
    assert.equal(r.phone2, "09120000002");
    assert.equal(r.instagram, "ink.one");
    assert.equal(r.day, "1405-08-19");
    assert.equal(r.time, "14:00");
  });

  it("trainees: only the owner's, with sessions done, payments and debt", async () => {
    const t = await exportPocketTrainees(sql, "owner");
    assert.equal(t.trainees.length, 1);
    assert.equal(t.trainees[0].sessionsDone, 5);
    assert.equal(t.trainees[0].sessionGoal, 12);
    assert.equal(t.trainees[0].paidToman, 200000);
    assert.equal(t.trainees[0].debtToman, 300000);
    assert.equal(t.traineePayments.length, 1);
  });

  it("finance: real customer payments + owner's expenses, non-zero balance", async () => {
    const f = await exportPocketFinance(sql, "owner", { month: 2500000, all: 2500000 }, new Date("2026-11-07T09:00:00Z"));
    assert.equal(f.summary.incomeToman, 1500000);
    assert.equal(f.summary.expenseToman, 700000);
    assert.equal(f.summary.balanceToman, 800000);
    assert.equal(f.summary.openReceivableToman, 2500000);
    assert.equal(f.currentMonth.paid, 1500000);
    assert.equal(f.records.filter((r) => r.kind === "income").length, 2);
  });

  it("analytics migration is additive only", () => {
    const m = readFileSync(join(root, "migrations/0058_app_analytics.sql"), "utf8").toLowerCase();
    assert.ok(!/\b(drop|truncate|delete|alter table)\b/.test(m));
  });
});

describe("telemetry / download security contract", () => {
  const route = readFileSync(join(root, "src/routes/api/app-telemetry.ts"), "utf8");
  const apk = readFileSync(join(root, "src/routes/api/booking-apk.ts"), "utf8");
  const lib = readFileSync(join(root, "src/lib/server/app-analytics.ts"), "utf8");
  it("anonymous install route is rate-limited and never binds an account", () => {
    assert.ok(route.includes("allowRate("));
    assert.ok(route.includes("performAppTelemetryInstall(null"));
    const fn = lib.slice(lib.indexOf("export async function performAppTelemetryInstall"), lib.indexOf("/** Upsert"));
    assert.ok(!fn.includes("data.accountEmail"), "email only from verified session");
  });
  it("download counts only served bytes, takes no client email, no dev-file fallback", () => {
    assert.ok(!apk.includes("searchParams"));
    assert.ok(!apk.includes("dist"));
    assert.ok(apk.indexOf("if (!bytes)") < apk.indexOf("recordAppDownloadEvent({"));
    assert.ok(apk.includes("allowRate("));
  });
  it("report labels provenance (installs/revenue self-reported)", () => {
    assert.ok(lib.includes('installs: "self-reported"'));
    assert.ok(lib.includes('monthlyRevenue: "self-reported"'));
  });
});
