import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "../db.ts";
import {
  attachReferral,
  performReferralDesk,
  performSetReferralMember,
  performSetReferralOverride,
  performSetReferralReward,
  referralProgress,
  syncReferralRequest,
} from "./studio-referrals.ts";

function asSql(db: PGlite): Sql {
  const sql = (async () => []) as unknown as Sql;
  sql.query = async <T>(text: string, params?: unknown[]) => {
    const result = await db.query<T>(text, params);
    return result.rows;
  };
  return sql;
}

async function boot() {
  const db = new PGlite();
  await db.exec(`
    create table profiles (user_id text primary key, is_admin boolean not null default false);
    create table notifications (
      id text primary key,
      user_id text not null,
      title text not null,
      body text not null,
      kind text not null,
      booking_id text,
      business_id text,
      read_at timestamptz,
      created_at timestamptz not null default now()
    );
    create table tattoo_requests (
      id text primary key,
      customer_id text,
      customer_name text,
      customer_phone text,
      customer_phone_2 text,
      status text not null default 'submitted',
      payment_status text not null default 'not_required'
    );
    insert into profiles (user_id, is_admin) values ('admin', true);
  `);
  return asSql(db);
}

async function request(sql: Sql, id: string, name: string, phone: string, status = "submitted", payment = "not_required") {
  await sql.query(
    `insert into tattoo_requests (id, customer_name, customer_phone, status, payment_status) values ($1,$2,$3,$4,$5)`,
    [id, name, phone, status, payment],
  );
}

describe("referral progress", () => {
  it("does not count a form, a price, or an unpaid hold as success", () => {
    assert.equal(referralProgress({ status: "submitted", paymentStatus: "not_required" }).successful, false);
    assert.equal(referralProgress({ status: "submitted", paymentStatus: "not_required" }).stage, "submitted");
    assert.equal(referralProgress({ status: "needs_info", paymentStatus: "not_required" }).publicLabel, "در حال بررسی");
    const priced = referralProgress({ status: "approved", paymentStatus: "proposal_pending" });
    assert.equal(priced.successful, false);
    assert.equal(priced.stage, "priced");
    assert.equal(priced.publicLabel, "قیمت اعلام شد");
    const waiting = referralProgress({ status: "approved", paymentStatus: "awaiting_payment" });
    assert.equal(waiting.successful, false);
    assert.equal(waiting.stage, "time");
    const receipt = referralProgress({ status: "approved", paymentStatus: "receipt_submitted" });
    assert.equal(receipt.successful, false);
    assert.equal(receipt.stage, "paid");
    assert.equal(referralProgress({ status: "approved", paymentStatus: "rejected" }).successful, false);
    assert.equal(referralProgress({ status: "booked", paymentStatus: "awaiting_payment" }).successful, false);
  });

  it("counts only a booked request with an approved receipt", () => {
    const booked = referralProgress({ status: "booked", paymentStatus: "approved" });
    assert.equal(booked.successful, true);
    assert.equal(booked.publicLabel, "نوبت قطعی شد");
    assert.equal(booked.steps.every((step) => step.done), true);
  });

  it("does not count a rejected or expired request", () => {
    assert.equal(referralProgress({ status: "rejected", paymentStatus: "not_required" }).successful, false);
    assert.equal(referralProgress({ status: "rejected", paymentStatus: "not_required" }).stage, "closed");
    assert.equal(referralProgress({ status: "approved", paymentStatus: "expired" }).stage, "closed");
    assert.equal(referralProgress({ status: "booked", paymentStatus: "expired" }).successful, false);
  });
});

describe("referral club rules", () => {
  it("follows the real booking path and blocks abuse", async () => {
    const sql = await boot();
    const member = await performSetReferralMember(sql, {
      name: "پیمان",
      phone: "09120000001",
      active: true,
      tier: "active",
    });
    assert.match(member.code, /^PYMAN-\d{4}$/);
    await sql.query(`update studio_referrers set code='PEYMAN-2847' where id=$1`, [member.id]);

    const empty = await attachReferral(sql, {
      requestId: "r-empty",
      customerName: "بدون کد",
      customerPhone: "09120000009",
    });
    assert.equal(empty.attached, false);

    await request(sql, "r-self", "پیمان", "09120000001");
    const self = await attachReferral(sql, {
      requestId: "r-self",
      customerName: "پیمان",
      customerPhone: "09120000001",
      code: "PEYMAN-2847",
    });
    assert.match(self.note, /خودتان/);

    await request(sql, "r-b", "علی احمدی", "09120000002");
    const bad = await attachReferral(sql, {
      requestId: "r-b",
      customerName: "علی احمدی",
      customerPhone: "09120000002",
      code: "NO-0000",
    });
    assert.match(bad.note, /پیدا نشد/);
    const linked = await attachReferral(sql, {
      requestId: "r-b",
      customerName: "علی احمدی",
      customerPhone: "09120000002",
      code: "peyman-2847",
    });
    assert.equal(linked.attached, true);

    await performSetReferralMember(sql, {
      name: "دیگری",
      phone: "09120000003",
      code: "OTHER-1111",
      active: true,
      tier: "active",
    });
    await request(sql, "r-b2", "علی احمدی", "09120000002");
    const again = await attachReferral(sql, {
      requestId: "r-b2",
      customerName: "علی احمدی",
      customerPhone: "09120000002",
      code: "OTHER-1111",
    });
    assert.match(again.note, /عوض نشد/);
    const rows = await sql.query<{ referrer_id: string }>(`select referrer_id from studio_referrals`);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.referrer_id, member.id);

    await syncReferralRequest(sql, "r-b");
    let score = await sql.query<{ successful: boolean; stage: string }>(`select successful, stage from studio_referrals where request_id='r-b'`);
    assert.equal(score[0]?.successful, false);
    assert.equal(score[0]?.stage, "submitted");

    await sql.query(`update tattoo_requests set status='approved', payment_status='proposal_pending' where id='r-b'`);
    await syncReferralRequest(sql, "r-b");
    score = await sql.query(`select successful, stage from studio_referrals where request_id='r-b'`);
    assert.equal(score[0]?.successful, false);
    assert.equal(score[0]?.stage, "priced");

    await sql.query(`update tattoo_requests set payment_status='awaiting_payment' where id='r-b'`);
    await syncReferralRequest(sql, "r-b");
    await sql.query(`update tattoo_requests set payment_status='receipt_submitted' where id='r-b'`);
    await syncReferralRequest(sql, "r-b");
    score = await sql.query(`select successful, stage from studio_referrals where request_id='r-b'`);
    assert.equal(score[0]?.successful, false);
    assert.equal(score[0]?.stage, "paid");

    await sql.query(`update tattoo_requests set status='booked', payment_status='approved' where id='r-b'`);
    await syncReferralRequest(sql, "r-b");
    score = await sql.query(`select successful, stage from studio_referrals where request_id='r-b'`);
    assert.equal(score[0]?.successful, true);
    const notes = await sql.query<{ title: string; body: string }>(`select title, body from notifications where kind='referral'`);
    assert.ok(notes.some((note) => note.body.includes("PEYMAN-2847") && note.body.includes("علی احمدی")));

    await sql.query(`update tattoo_requests set status='rejected', payment_status='not_required' where id='r-b'`);
    await syncReferralRequest(sql, "r-b");
    score = await sql.query(`select successful, stage from studio_referrals where request_id='r-b'`);
    assert.equal(score[0]?.successful, false);
    assert.equal(score[0]?.stage, "closed");

    for (let index = 0; index < 5; index += 1) {
      const id = `r-win-${index}`;
      await request(sql, id, `مشتری ${index}`, `0912000001${index}`, "booked", "approved");
      const added = await attachReferral(sql, {
        requestId: id,
        customerName: `مشتری ${index}`,
        customerPhone: `0912000001${index}`,
        code: "PEYMAN-2847",
      });
      assert.equal(added.attached, true);
      await syncReferralRequest(sql, id);
    }
    const rewards = await sql.query<{ milestone: number; status: string }>(
      `select milestone, status from studio_referral_rewards order by milestone`,
    );
    assert.deepEqual(rewards.map((row) => row.milestone), [5]);
    assert.equal(rewards[0]?.status, "active");

    await sql.query(`update tattoo_requests set status='rejected', payment_status='not_required' where id='r-win-0'`);
    await syncReferralRequest(sql, "r-win-0");
    const afterDrop = await sql.query(`select milestone, status from studio_referral_rewards`);
    assert.equal(afterDrop.length, 0);

    await sql.query(`update tattoo_requests set status='booked', payment_status='approved' where id='r-win-0'`);
    await syncReferralRequest(sql, "r-win-0");
    await performSetReferralReward(sql, { referrerId: member.id, milestone: 5, status: "used" });
    await sql.query(`update tattoo_requests set status='rejected', payment_status='not_required' where id='r-win-0'`);
    await syncReferralRequest(sql, "r-win-0");
    const used = await sql.query<{ status: string }>(`select status from studio_referral_rewards where milestone=5`);
    assert.equal(used[0]?.status, "used");

    await performSetReferralMember(sql, {
      name: "محدود",
      phone: "09120000077",
      code: "LIMIT-1000",
      active: true,
      tier: "limited",
    });
    await request(sql, "r-limit", "مهمان", "09120000088");
    const limited = await attachReferral(sql, {
      requestId: "r-limit",
      customerName: "مهمان",
      customerPhone: "09120000088",
      code: "LIMIT-1000",
    });
    assert.equal(limited.attached, false);

    const open = await sql.query<{ id: string }>(`select id from studio_referrals where request_id='r-win-1'`);
    await performSetReferralOverride(sql, { id: open[0]?.id, success: false });
    const forced = await sql.query<{ successful: boolean }>(`select successful from studio_referrals where request_id='r-win-1'`);
    assert.equal(forced[0]?.successful, false);
    await performSetReferralOverride(sql, { id: open[0]?.id, success: null });
    const restored = await sql.query<{ successful: boolean }>(`select successful from studio_referrals where request_id='r-win-1'`);
    assert.equal(restored[0]?.successful, true);

    const desk = await performReferralDesk(sql);
    assert.equal(desk.summary.members, 3);
    assert.ok(desk.summary.successful >= 4);
  });
});
