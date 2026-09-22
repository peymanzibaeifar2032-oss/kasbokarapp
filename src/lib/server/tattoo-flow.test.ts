import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { STUDIO_OWNER_STAFF_NAME, TATTOO_CUSTOMER_STAGE_LABEL, TATTOO_SETTLEMENT_PRESETS, isRetiredCollaborator, tattooBalance, tattooStage } from "../tattoo-flow.ts";
import {
  expireTattooHoldSql,
  TATTOO_OVERDUE_REVIEW_SQL,
  TATTOO_PENDING_PROPOSAL_OVERLAP_SQL,
  TATTOO_SLOT_OVERLAP_SQL,
} from "./tattoo-holds.ts";

const SCHEMA = `
create table businesses (
  id text primary key,
  owner_id text not null,
  name text not null
);
create table bookings (
  id text primary key,
  business_id text not null references businesses(id),
  customer_id text,
  customer_name text,
  customer_phone text,
  slot_start timestamptz not null,
  slot_end timestamptz,
  kind text not null default 'booking',
  note text,
  status text not null default 'requested',
  service_title text,
  party_size int not null default 1,
  finance_status text not null default 'no_payment_required'
);
create table tattoo_requests (
  id text primary key,
  customer_id text not null,
  business_id text,
  booking_id text,
  customer_name text not null,
  customer_phone text not null,
  request_type text not null default 'new',
  style text not null,
  idea text not null,
  placement text not null,
  size_cm text not null,
  status text not null default 'submitted',
  price_min_toman int,
  session_minutes int,
  session_count int,
  deposit_toman int,
  artist_message text,
  payment_status text not null default 'not_required',
  payment_hold_until timestamptz,
  payment_submitted_at timestamptz,
  payment_review_deadline timestamptz,
  receipt_image text,
  payment_iban text,
  payment_card_number text,
  proposed_slot_start timestamptz,
  proposed_slot_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
`;

const START = "2026-10-12T08:30:00+00:00";
const END = "2026-10-12T11:30:00+00:00";
const LATER_START = "2026-10-13T08:30:00+00:00";
const LATER_END = "2026-10-13T11:30:00+00:00";
const OTHER_START = "2026-10-14T08:30:00+00:00";
const OTHER_END = "2026-10-14T11:30:00+00:00";

async function boot() {
  const db = new PGlite();
  await db.exec(SCHEMA);
  await db.query(`insert into businesses (id, owner_id, name) values ('biz','artist','پیمان')`);
  return db;
}

async function insertRequest(db: PGlite, id: string, style: string, customerId = "cust") {
  await db.query(
    `insert into tattoo_requests
      (id, customer_id, customer_name, customer_phone, style, idea, placement, size_cm)
     values ($1,$2,'مشتری تست','09120000000',$3,'توضیح طرح تست برای بررسی مسیر','ساعد','۲۰ سانت')`,
    [id, customerId, style],
  );
}

async function propose(db: PGlite, id: string, start: string, end: string) {
  await db.query(
    `update tattoo_requests set status='approved', business_id='biz', price_min_toman=8000000,
       session_minutes=180, session_count=1, deposit_toman=2000000,
       artist_message='قیمت و زمان پیشنهادی', payment_status='proposal_pending',
       payment_iban='IR120170000000100324200001', payment_card_number='6037991111111111',
       proposed_slot_start=$2, proposed_slot_end=$3, booking_id=null, updated_at=now()
     where id=$1`,
    [id, start, end],
  );
}

async function accept(db: PGlite, id: string, bookingId: string, start: string, end: string, customerId = "cust") {
  const overlap = await db.query(TATTOO_SLOT_OVERLAP_SQL, ["biz", start, end]);
  if (overlap.rows[0]) throw new Error("overlap");
  await db.query(
    `insert into bookings (id, business_id, customer_id, customer_name, customer_phone, slot_start, slot_end, kind, note, status, service_title, party_size)
     values ($1,'biz',$5,'مشتری تست','09120000000',$2,$3,'booking','طرح','requested',$4,1)`,
    [bookingId, start, end, id, customerId],
  );
  await db.query(
    `update tattoo_requests set booking_id=$2, payment_status='awaiting_payment',
       payment_hold_until=now()+interval '6 hours', updated_at=now()
     where id=$1 and payment_status='proposal_pending'`,
    [id, bookingId],
  );
}

describe("tattoo staged labels", () => {
  it("shows the customer-facing stage, not a generic approved badge", () => {
    assert.equal(
      TATTOO_CUSTOMER_STAGE_LABEL[tattooStage({ status: "approved", paymentStatus: "proposal_pending" })],
      "پیشنهاد ارسال شده",
    );
    assert.equal(
      TATTOO_CUSTOMER_STAGE_LABEL[tattooStage({ status: "approved", paymentStatus: "awaiting_payment" })],
      "منتظر پرداخت",
    );
    assert.equal(
      TATTOO_CUSTOMER_STAGE_LABEL[tattooStage({
        status: "approved",
        paymentStatus: "receipt_submitted",
        paymentReviewDeadline: new Date(Date.now() + 60_000).toISOString(),
      })],
      "رسید در دست بررسی",
    );
    assert.equal(
      TATTOO_CUSTOMER_STAGE_LABEL[tattooStage({
        status: "approved",
        paymentStatus: "receipt_submitted",
        paymentReviewDeadline: new Date(Date.now() - 60_000).toISOString(),
      })],
      "بررسی رسید از مهلت گذشته",
    );
    assert.equal(
      TATTOO_CUSTOMER_STAGE_LABEL[tattooStage({ status: "approved", paymentStatus: "rejected" })],
      "رسید نیازمند اصلاح",
    );
    assert.equal(
      TATTOO_CUSTOMER_STAGE_LABEL[tattooStage({ status: "booked", paymentStatus: "approved" })],
      "رزرو قطعی",
    );
    assert.equal(
      TATTOO_CUSTOMER_STAGE_LABEL[tattooStage({ status: "approved", paymentStatus: "expired" })],
      "مهلت واریز تمام شد",
    );
  });
});

describe("tattoo request → calendar lock", () => {
  it("artist reject/needs_info/propose, customer accept, expire, receipt reject+fix, confirm", async () => {
    const db = await boot();
    await insertRequest(db, "r-reject", "کاور");
    await insertRequest(db, "r-info", "مینیمال");
    await insertRequest(db, "r-pay", "رئال");
    await insertRequest(db, "r-expire", "پرتره");

    await db.query(
      `update tattoo_requests set status='rejected', artist_message='این طرح الان قابل اجرا نیست', payment_status='not_required'
       where id='r-reject'`,
    );
    await db.query(
      `update tattoo_requests set status='needs_info', artist_message='عکس واضح‌تر از محل بدن بفرستید', payment_status='not_required'
       where id='r-info'`,
    );
    await propose(db, "r-pay", START, END);
    await propose(db, "r-expire", LATER_START, LATER_END);

    const pending = await db.query<{ payment_status: string }>(
      `select payment_status from tattoo_requests where id='r-pay'`,
    );
    assert.equal(pending.rows[0]?.payment_status, "proposal_pending");
    const beforeAccept = await db.query(`select id from bookings`);
    assert.equal(beforeAccept.rows.length, 0);

    await accept(db, "r-pay", "b-pay", START, END);
    await accept(db, "r-expire", "b-expire", LATER_START, LATER_END);

    const held = await db.query<{ status: string }>(`select status from bookings where id='b-pay'`);
    assert.equal(held.rows[0]?.status, "requested");

    await db.query(
      `update tattoo_requests set payment_hold_until=now()-interval '1 minute' where id='r-expire'`,
    );
    const expire = expireTattooHoldSql({ customerScoped: false });
    await db.query(expire.cancelBookings);
    await db.query(expire.expireRequests);

    const expiredReq = await db.query<{ status: string; payment_status: string; booking_id: string | null }>(
      `select status, payment_status, booking_id from tattoo_requests where id='r-expire'`,
    );
    assert.equal(expiredReq.rows[0]?.status, "approved");
    assert.equal(expiredReq.rows[0]?.payment_status, "expired");
    assert.equal(expiredReq.rows[0]?.booking_id, null);
    const expiredBooking = await db.query<{ status: string }>(`select status from bookings where id='b-expire'`);
    assert.equal(expiredBooking.rows[0]?.status, "cancelled");

    const stillHeld = await db.query<{ status: string; payment_status: string }>(
      `select b.status, t.payment_status from bookings b join tattoo_requests t on t.booking_id=b.id where t.id='r-pay'`,
    );
    assert.equal(stillHeld.rows[0]?.status, "requested");
    assert.equal(stillHeld.rows[0]?.payment_status, "awaiting_payment");

    await db.query(
      `update tattoo_requests set payment_status='receipt_submitted', payment_submitted_at=now(),
         payment_review_deadline=now()+interval '12 hours', receipt_image='data:image/jpeg;base64,abc'
       where id='r-pay'`,
    );
    await db.query(
      `update tattoo_requests set payment_hold_until=now()-interval '1 minute' where id='r-pay'`,
    );
    await db.query(expire.cancelBookings);
    await db.query(expire.expireRequests);
    const afterReceiptExpire = await db.query<{ status: string; payment_status: string; booking_status: string }>(
      `select t.status, t.payment_status, b.status as booking_status
         from tattoo_requests t join bookings b on b.id=t.booking_id
        where t.id='r-pay'`,
    );
    assert.equal(afterReceiptExpire.rows[0]?.status, "approved");
    assert.equal(afterReceiptExpire.rows[0]?.payment_status, "receipt_submitted");
    assert.equal(afterReceiptExpire.rows[0]?.booking_status, "requested");

    await db.query(
      `update tattoo_requests set payment_status='rejected', payment_hold_until=now()+interval '6 hours',
         payment_submitted_at=null, payment_review_deadline=null,
         artist_message='رسید تار است. عکس واضح‌تری بفرستید'
       where id='r-pay'`,
    );
    const afterReject = await db.query<{ payment_status: string; booking_status: string }>(
      `select t.payment_status, b.status as booking_status
         from tattoo_requests t join bookings b on b.id=t.booking_id
        where t.id='r-pay'`,
    );
    assert.equal(afterReject.rows[0]?.payment_status, "rejected");
    assert.equal(afterReject.rows[0]?.booking_status, "requested");

    await db.query(
      `update tattoo_requests set payment_status='receipt_submitted', payment_submitted_at=now(),
         payment_review_deadline=now()+interval '12 hours', receipt_image='data:image/jpeg;base64,ok'
       where id='r-pay'`,
    );
    await db.query(
      `update tattoo_requests set status='booked', payment_status='approved', artist_message='نوبت قطعی شد' where id='r-pay'`,
    );
    await db.query(`update bookings set status='confirmed', finance_status='deposit_paid' where id='b-pay'`);

    const final = await db.query<{ status: string; payment_status: string; booking_status: string }>(
      `select t.status, t.payment_status, b.status as booking_status
         from tattoo_requests t join bookings b on b.id=t.booking_id
        where t.id='r-pay'`,
    );
    assert.equal(final.rows[0]?.status, "booked");
    assert.equal(final.rows[0]?.payment_status, "approved");
    assert.equal(final.rows[0]?.booking_status, "confirmed");

    await propose(db, "r-expire", OTHER_START, OTHER_END);
    await accept(db, "r-expire", "b-expire-2", OTHER_START, OTHER_END);
    await db.query(
      `update tattoo_requests set status='booked', payment_status='approved' where id='r-expire'`,
    );
    await db.query(`update bookings set status='confirmed', finance_status='deposit_paid' where id='b-expire-2'`);

    const calendar = await db.query<{ id: string; status: string }>(
      `select id, status from bookings where status='confirmed' order by slot_start`,
    );
    assert.deepEqual(
      calendar.rows.map((row) => row.id),
      ["b-pay", "b-expire-2"],
    );
    const cancelled = await db.query(`select id from bookings where status='cancelled'`);
    assert.equal(cancelled.rows.length, 1);

    const rejected = await db.query<{ status: string }>(`select status from tattoo_requests where id='r-reject'`);
    assert.equal(rejected.rows[0]?.status, "rejected");
    const info = await db.query<{ status: string }>(`select status from tattoo_requests where id='r-info'`);
    assert.equal(info.rows[0]?.status, "needs_info");
  });

  it("does not reject the whole request when the 6h hold expires", async () => {
    const db = await boot();
    await insertRequest(db, "r1", "رئال");
    await propose(db, "r1", START, END);
    await accept(db, "r1", "b1", START, END);
    await db.query(`update tattoo_requests set payment_hold_until=now()-interval '5 minutes' where id='r1'`);
    const expire = expireTattooHoldSql({ customerScoped: true });
    await db.query(expire.cancelBookings, ["cust"]);
    await db.query(expire.expireRequests, ["cust"]);
    const row = await db.query<{ status: string; payment_status: string; booking_id: string | null }>(
      `select status, payment_status, booking_id from tattoo_requests where id='r1'`,
    );
    assert.equal(row.rows[0]?.status, "approved");
    assert.equal(row.rows[0]?.payment_status, "expired");
    assert.equal(row.rows[0]?.booking_id, null);
  });

  it("keeps the slot locked after the 12h receipt review deadline", async () => {
    const db = await boot();
    await insertRequest(db, "r-review", "رئال");
    await propose(db, "r-review", START, END);
    await accept(db, "r-review", "b-review", START, END);
    await db.query(
      `update tattoo_requests set payment_status='receipt_submitted', payment_submitted_at=now()-interval '13 hours',
         payment_review_deadline=now()-interval '1 hour', receipt_image='data:image/jpeg;base64,abc',
         payment_hold_until=now()-interval '7 hours'
       where id='r-review'`,
    );
    const expire = expireTattooHoldSql({ customerScoped: false });
    await db.query(expire.cancelBookings);
    await db.query(expire.expireRequests);
    const row = await db.query<{ status: string; payment_status: string; booking_status: string }>(
      `select t.status, t.payment_status, b.status as booking_status
         from tattoo_requests t join bookings b on b.id=t.booking_id
        where t.id='r-review'`,
    );
    assert.equal(row.rows[0]?.status, "approved");
    assert.equal(row.rows[0]?.payment_status, "receipt_submitted");
    assert.equal(row.rows[0]?.booking_status, "requested");
    const overdue = await db.query(TATTOO_OVERDUE_REVIEW_SQL);
    assert.equal(overdue.rows.length, 1);
  });

  it("releases the slot if the customer does not fix a rejected receipt in 6 hours", async () => {
    const db = await boot();
    await insertRequest(db, "r-fix", "رئال");
    await propose(db, "r-fix", START, END);
    await accept(db, "r-fix", "b-fix", START, END);
    await db.query(
      `update tattoo_requests set payment_status='rejected', payment_hold_until=now()-interval '1 minute',
         artist_message='رسید ناخوانا است'
       where id='r-fix'`,
    );
    const expire = expireTattooHoldSql({ customerScoped: false });
    await db.query(expire.cancelBookings);
    await db.query(expire.expireRequests);
    const row = await db.query<{ status: string; payment_status: string; booking_id: string | null }>(
      `select status, payment_status, booking_id from tattoo_requests where id='r-fix'`,
    );
    assert.equal(row.rows[0]?.status, "approved");
    assert.equal(row.rows[0]?.payment_status, "expired");
    assert.equal(row.rows[0]?.booking_id, null);
    const cancelled = await db.query<{ status: string }>(`select status from bookings where id='b-fix'`);
    assert.equal(cancelled.rows[0]?.status, "cancelled");
  });

  it("blocks a second customer from taking an overlapping locked slot", async () => {
    const db = await boot();
    await insertRequest(db, "r-a", "رئال", "cust-a");
    await insertRequest(db, "r-b", "کاور", "cust-b");
    await propose(db, "r-a", START, END);
    await propose(db, "r-b", START, END);
    const pending = await db.query(TATTOO_PENDING_PROPOSAL_OVERLAP_SQL, ["biz", START, END, "r-b"]);
    assert.equal(Boolean(pending.rows[0]), true);
    await accept(db, "r-a", "b-a", START, END, "cust-a");
    await assert.rejects(() => accept(db, "r-b", "b-b", START, END, "cust-b"), /overlap/);
    const bookings = await db.query(`select id, status from bookings`);
    assert.equal(bookings.rows.length, 1);
    assert.equal((bookings.rows[0] as { id: string }).id, "b-a");
  });
});

describe("tattooBalance and bank presets", () => {
  it("shows paid, remaining and settled for installment work", () => {
    assert.deepEqual(tattooBalance(10_000_000, 2_000_000), {
      total: 10_000_000,
      paid: 2_000_000,
      remaining: 8_000_000,
      settled: false,
    });
    assert.equal(tattooBalance(5_000_000, 5_000_000).settled, true);
    assert.equal(tattooBalance(5_000_000, 6_000_000).remaining, 0);
    assert.equal(tattooBalance(null, 0).settled, false);
    assert.equal(tattooBalance(0, 0).settled, false);
  });

  it("fills both IBAN and card from each titled bank", () => {
    assert.equal(TATTOO_SETTLEMENT_PRESETS.length, 2);
    assert.equal(TATTOO_SETTLEMENT_PRESETS[0].title, "پیمان زیبائی‌فر کارت بانک مهر ایران");
    assert.equal(TATTOO_SETTLEMENT_PRESETS[1].title, "پیمان زیبائی‌فر بانک مسکن");
    for (const preset of TATTOO_SETTLEMENT_PRESETS) {
      assert.equal(preset.iban, "IR160140040000152900013417");
      assert.equal(preset.card, "6280231566846282");
    }
  });

  it("keeps only Peyman as studio staff and drops Mehrdad spellings", () => {
    assert.equal(STUDIO_OWNER_STAFF_NAME, "پیمان زیبائی‌فر");
    assert.equal(isRetiredCollaborator("مهرداد"), true);
    assert.equal(isRetiredCollaborator("مهررداد"), true);
    assert.equal(isRetiredCollaborator("پیمان زیبائی‌فر"), false);
  });
});
