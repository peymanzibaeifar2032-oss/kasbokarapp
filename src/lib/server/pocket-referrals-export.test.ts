import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { exportPocketReferrals } from "./pocket-referrals-export.ts";
import { clubMemberSms, FALLBACK_CLUB_SMS } from "../referral-sms.ts";

test("referral export is SELECT-only, takes no caller input and never exports referred friends", async () => {
  const statements: string[] = [];
  const sql = {
    query: async <T>(query: string, params: unknown[]): Promise<T[]> => {
      statements.push(query);
      assert.deepEqual(params, []);
      assert.ok(query.trim().startsWith("select"), query);
      if (query.includes("studio_referral_settings")) return [{ prize5: "P5", prize10: "P10", sms_submitted: "S {code}", sms_priced: "Pr", sms_booked: "B {count}", sms_prize5: "Z5 {prize}", sms_prize10: "Z10 {prize}" }] as T[];
      if (query.includes("from studio_referrers")) return [{ id: "m1", name: "عضو", phone: "09120000009", code: "ABC-1", active: true, tier: "active", total: 3, successful: 2 }] as T[];
      if (query.includes("studio_referral_rewards")) return [{ referrer_id: "m1", milestone: 5, title: "جایزه", status: "active" }, { referrer_id: "other", milestone: 5, title: "x", status: "active" }] as T[];
      if (query.includes("studio_referral_outbox")) return [{ id: "o1", phone: "09120000009", body: "متن", referrer_id: "m1" }] as T[];
      throw new Error("unexpected " + query);
    },
  };
  const out = await exportPocketReferrals(sql);
  assert.equal(statements.length, 4);
  assert.ok(statements.every((q) => !/\b(insert|update|delete|create|alter|drop)\b/i.test(q)));
  assert.ok(statements.every((q) => !q.includes("referred_phone") && !q.includes("request_id")));
  assert.equal(out.settings?.smsSubmitted, "S {code}");
  assert.deepEqual(out.members[0].rewards, [{ milestone: 5, title: "جایزه", status: "active" }]);
  assert.deepEqual(out.outbox, [{ id: "o1", phone: "09120000009", body: "متن", referrerId: "m1" }]);
});

test("club SMS defaults are the server defaults and member texts are exact", () => {
  const server = readFileSync(new URL("./studio-referrals.ts", import.meta.url), "utf8");
  for (const v of [FALLBACK_CLUB_SMS.smsSubmitted, FALLBACK_CLUB_SMS.smsPriced, FALLBACK_CLUB_SMS.smsBooked, FALLBACK_CLUB_SMS.smsPrize5, FALLBACK_CLUB_SMS.smsPrize10, FALLBACK_CLUB_SMS.prize5, FALLBACK_CLUB_SMS.prize10])
    assert.ok(server.includes(JSON.stringify(v).slice(1, -1)), v);
  const rows = clubMemberSms({ name: "سارا", phone: "09120000009", code: "SARA-1" }, 3, [], undefined);
  assert.deepEqual(rows.map((r) => r.label), ["کد عضویت", "وارد بررسی شد", "قیمت اعلام شد", "معرفی موفق", "جایزه ۵", "جایزه ۱۰"]);
  assert.equal(rows[0].body, "سلام سارا\nکد عضویت باشگاه مشتریان تو: SARA-1\nاین کد را به دوستت بده. وقتی نوبت او قطعی شد، یک معرفی موفق برای تو ثبت می‌شود.\n۵ معرفی موفق: یک طرح مینیمال تا ۱۲ سانتی‌متر\n۱۰ معرفی موفق: یک طرح تا ۲۶ سانتی‌متر");
  assert.equal(rows[1].body, "یکی از دوستانی که با کد معرف شما درخواست داده، وارد مرحله بررسی شد.\nکد عضویت شما: SARA-1");
  assert.equal(rows[2].body, "برای یکی از معرفی‌های شما قیمت و شرایط مشخص شد.\nکد عضویت شما: SARA-1");
  assert.equal(rows[3].body, "یک معرفی موفق برای شما ثبت شد. اکنون ۳ معرفی موفق از ۱۰ معرفی دارید.\nکد عضویت شما: SARA-1");
  assert.equal(rows[4].body, "تبریک! شما ۵ معرفی موفق دارید. جایزه شما فعال شد: یک طرح مینیمال تا ۱۲ سانتی‌متر. برای هماهنگی ثبت نوبت از پنل خود اقدام کنید.\nکد عضویت شما: SARA-1");
  assert.equal(rows[5].body, "تبریک! شما ۱۰ معرفی موفق دارید. جایزه دوم شما فعال شد: یک طرح تا ۲۶ سانتی‌متر.\nکد عضویت شما: SARA-1");
  // owner-customised text without {code} still gets the code appended, like the site
  const custom = clubMemberSms({ name: "a", phone: "0", code: "C-9" }, 1, [{ milestone: 5, title: "هدیه", status: "active" }], { ...FALLBACK_CLUB_SMS, smsPrize5: "جایزه: {prize}" });
  assert.equal(custom[4].body, "جایزه: هدیه\nکد عضویت شما: C-9");
});

test("panel uses the shared club SMS source (no second copy)", () => {
  const panel = readFileSync(new URL("../../components/studio/referral-admin.tsx", import.meta.url), "utf8");
  assert.ok(panel.includes("clubMemberSms(person, success, rewards, settings)"));
  assert.ok(!panel.includes("const FALLBACK_SMS"));
});

test("contract: real club tables (created by the site's own ensureTables) export without writes", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { performSaveReferralSettings } = await import("./studio-referrals.ts");
  const db = new PGlite();
  const sql = { query: async <T>(q: string, params: unknown[] = []) => (await db.query(q, params as unknown[])).rows as T[] };
  // Fresh tables get the server defaults; then the owner saves custom texts exactly like the panel does.
  await performSaveReferralSettings(sql as never, { ...FALLBACK_CLUB_SMS, smsBooked: "دوست شما ثبت شد: {count}" });
  await db.exec(`
    insert into studio_referrers (id, name, phone, code) values ('m1','عضو آزمایشی','09120000009','TEST-1');
    insert into studio_referrals (id, referrer_id, request_id, referred_phone, successful) values ('x1','m1','req1','09129999999', true);
    insert into studio_referral_rewards (id, referrer_id, milestone, title) values ('w1','m1',5,'جایزه آزمایشی');
    insert into studio_referral_outbox (id, referrer_id, phone, kind, body) values ('o1','m1','09120000009','booked','متن آماده');
  `);
  const out = await exportPocketReferrals(sql);
  assert.equal(out.settings?.smsBooked, "دوست شما ثبت شد: {count}");
  assert.equal(out.settings?.smsSubmitted, FALLBACK_CLUB_SMS.smsSubmitted);
  assert.equal(out.members[0].successful, 1);
  assert.ok(!JSON.stringify(out).includes("09129999999"), "referred friend phone never exported");
  assert.ok(!JSON.stringify(out).includes("req1"));
  assert.equal(out.outbox[0].body, "متن آماده");
  const [{ sent }] = await sql.query<{ sent: string | null }>(`select sent_at as sent from studio_referral_outbox where id='o1'`);
  assert.equal(sent, null, "export must not mark outbox as sent");
});
