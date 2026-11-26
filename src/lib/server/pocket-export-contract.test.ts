import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { exportPocketBookings, exportPocketPhotos, POCKET_PHOTO_BUDGET_CHARS } from "./pocket-bookings-export.ts";
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

describe("export stays inside app wire limits on odd rows", () => {
  it("odd ids / empty titles / long notes / zero goals are normalized, not dropped", async () => {
    await db.exec(`
      insert into tattoo_payments (id, request_id, amount_toman, note) values ('odd id/ü','r1',100,'${"x".repeat(900)}');
      insert into studio_expenses (id, user_id, category, title, amount_toman, month_jy, month_jm) values ('e3','owner','rent','',50,1405,8);
      insert into studio_apprentices (id, user_id, slug, name, phone, session_goal) values ('a3','owner','a3','صفر','0',0);`);
    const f = await exportPocketFinance(sql, "owner", { month: 0, all: 0 }, new Date("2026-11-07T09:00:00Z"));
    const odd = f.records.find((r) => r.serverId.startsWith("pay:odd"));
    assert.ok(odd && /^pay:[A-Za-z0-9_.:-]+$/.test(odd.serverId));
    assert.ok(odd.note.length <= 500);
    assert.ok(f.records.find((r) => r.serverId === "exp:e3")!.title.length > 0);
    const t = await exportPocketTrainees(sql, "owner");
    assert.equal(t.trainees.find((x) => x.serverId === "a3")!.sessionGoal, 1);
  });
});

describe("full export isolates sections", () => {
  it("finance/trainee failures are reported as errors, never as empty data", () => {
    const code = readFileSync(join(root, "src/lib/server/writes.ts"), "utf8");
    const fn = code.slice(code.indexOf("async function performStudioPocketExport"), code.indexOf("async function performStudioPocketAccess"));
    assert.ok(fn.includes("financeError"));
    assert.ok(fn.includes("trainingError"));
    assert.ok(fn.indexOf('actor.role !== "owner"') < fn.indexOf("exportPocketBookings(sql)"));
  });
});

describe("pocket design photos (synthetic images)", () => {
  // Tiny synthetic "images": valid data-URL syntax, not real photos.
  const panelImg = "data:image/jpeg;base64," + "A".repeat(4000);
  const fileImg = "data:image/png;base64," + "B".repeat(3000);
  const big = "data:image/jpeg;base64," + "C".repeat(1_200_000);
  const fid = "11111111-2222-3333-4444-555555555555";
  const otherFid = "99999999-2222-3333-4444-555555555555";
  const near = (n: number) => "data:image/jpeg;base64," + "D".repeat(n);
  before(async () => {
    await db.query(
      `insert into tattoo_requests (id, customer_id, customer_phone, customer_name, request_type, style, idea, placement, size_cm, status,
         price_min_toman, price_max_toman, session_count, session_minutes, deposit_toman, paid_toman, proposed_slot_start,
         tracking_code, reference_images)
       values ($1,'c','0912','طرح پنل','new','s','i','p','1','booked',0,0,1,60,0,0,'2026-11-11T10:00:00Z','P1',$2::jsonb),
              ($3,'c','0912','طرح مشتری','new','s','i','p','1','booked',0,0,1,60,0,0,'2026-11-12T10:00:00Z','P2',$4::jsonb),
              ($5,'c','0912','بزرگ','new','s','i','p','1','booked',0,0,1,60,0,0,'2026-11-13T10:00:00Z','P3',$6::jsonb),
              ($7,'c','0912','پیشنهادی','new','s','i','p','1','submitted',0,0,1,60,0,0,'2026-11-14T10:00:00Z','P4',$2::jsonb),
              ($8,'c','0912','فایل دیگری','new','s','i','p','1','booked',0,0,1,60,0,0,'2026-11-15T10:00:00Z','P5',$9::jsonb),
              ($10,'c','0912','ب۱','new','s','i','p','1','booked',0,0,1,60,0,0,'2026-11-16T10:00:00Z','P6',$11::jsonb),
              ($12,'c','0912','ب۲','new','s','i','p','1','booked',0,0,1,60,0,0,'2026-11-17T10:00:00Z','P7',$13::jsonb)`,
      [
        "ph1", JSON.stringify([panelImg]),
        "ph2", JSON.stringify([`/api/tattoo-file?id=${fid}`]),
        "ph3", JSON.stringify([big]),
        "ph4",
        "ph5", JSON.stringify([`/api/tattoo-file?id=${otherFid}`]),
        "ph6", JSON.stringify([near(900_000)]),
        "ph7", JSON.stringify([near(1_000_000)]),
      ],
    );
    await db.query(`insert into tattoo_request_files (id, request_id, kind, data) values ($1,'ph2','reference',$2), ($3,'ph1','reference',$4)`, [
      fid, fileImg, otherFid, fileImg,
    ]);
  });

  it("export carries a key, never the image bytes (keeps the 4 MB app response cap safe)", async () => {
    const rows = await exportPocketBookings(sql);
    const by = new Map(rows.map((r) => [r.serverId, r]));
    assert.match(by.get("ph1")!.photoKey, /^d[0-9a-f]{32}$/);
    assert.equal(by.get("ph2")!.photoKey, "f" + fid);
    assert.equal(by.get("r1")!.photoKey, "");
    assert.equal(by.has("ph4"), false);
    assert.ok(JSON.stringify(rows).length < 20_000, "no inline images");
    assert.equal(rows.some((r) => "photo" in r), false);
  });

  it("photos: panel data URL and customer tattoo-file both resolve with the same key as the export", async () => {
    const keys = new Map((await exportPocketBookings(sql)).map((r) => [r.serverId, r.photoKey]));
    const reply = await exportPocketPhotos(sql, ["ph1", "ph2"]);
    assert.deepEqual(reply.photos.map((p) => p.serverId), ["ph1", "ph2"]);
    assert.equal(reply.photos[0].data, panelImg);
    assert.equal(reply.photos[1].data, fileImg);
    assert.equal(reply.photos[0].key, keys.get("ph1"));
    assert.equal(reply.photos[1].key, keys.get("ph2"));
  });

  it("photos: oversize, non-booked, unknown and another job's file are never returned", async () => {
    const reply = await exportPocketPhotos(sql, ["ph3", "ph4", "nope", "ph5", "r1"]);
    assert.equal(reply.photos.length, 0);
    assert.deepEqual(reply.missing.sort(), ["nope", "ph3", "ph4", "ph5", "r1"].sort());
  });

  it("photos: response stays under budget; the rest is deferred, not dropped", async () => {
    // Real budget: three near-max images (2.9M chars) fit, nothing is lost.
    const full = await exportPocketPhotos(sql, ["ph6", "ph7", "ph1"]);
    assert.ok(full.photos.reduce((n, p) => n + p.data.length, 0) <= POCKET_PHOTO_BUDGET_CHARS);
    // Smaller budget: the second large image is deferred to the next call, the small one still fits.
    const reply = await exportPocketPhotos(sql, ["ph6", "ph7", "ph1"], 1_000_000);
    assert.deepEqual(reply.photos.map((p) => p.serverId), ["ph6", "ph1"]);
    assert.deepEqual(reply.deferred, ["ph7"]);
  });
});

