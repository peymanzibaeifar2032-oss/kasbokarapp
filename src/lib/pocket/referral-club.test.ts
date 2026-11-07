import assert from "node:assert/strict";
import { test } from "node:test";
import { effectiveClubSettings, parseReferralClub, validateClubSettings } from "./referral-club.ts";
import { parsePocketBackup, mergeBackup } from "./backup.ts";
import { parsePocketSnapshot } from "./sync-response.ts";
import { clubMemberSms, FALLBACK_CLUB_SMS } from "../referral-sms.ts";

// Synthetic fixture shaped like exportPocketReferrals() output.
const club = {
  status: "ok", generatedAt: "2026-11-07T09:00:00Z", truncated: false,
  settings: { ...FALLBACK_CLUB_SMS, smsBooked: "ثبت شد {count}" },
  members: [{ id: "m1", name: "عضو", phone: "09120000009", code: "TEST-1", active: true, tier: "active", successful: 2, total: 3, rewards: [] }],
  outbox: [{ id: "o1", phone: "09120000009", body: "متن سایت", referrerId: "m1" }],
};

test("club accepted only with a verified owner account; malformed club ignored entirely", () => {
  const base = { schemaVersion: 2, bookings: [], referralClub: club };
  assert.equal(parsePocketSnapshot(200, base).referralClub, null, "no account → no club");
  assert.equal(parsePocketSnapshot(200, { ...base, account: { isOwner: false, canViewAppStats: false, accountEmail: "" } }).referralClub, null);
  assert.equal(parsePocketSnapshot(200, { ...base, account: { isOwner: true, canViewAppStats: false, accountEmail: "" } }).referralClub?.members[0].code, "TEST-1");
  assert.equal(parseReferralClub({ ...club, members: [{ id: 1 }] }), null);
});

test("text precedence phone > site > default; site texts produce the exact panel SMS", () => {
  const c = parseReferralClub(club)!;
  assert.equal(effectiveClubSettings({ club: null, localSettings: null }).source, "default");
  const site = effectiveClubSettings({ club: c, localSettings: null });
  assert.equal(site.source, "site");
  const rows = clubMemberSms(c.members[0], 2, [], site.settings);
  assert.equal(rows[3].body, "ثبت شد ۲\nکد عضویت شما: TEST-1");
  assert.equal(rows[1].body, "یکی از دوستانی که با کد معرف شما درخواست داده، وارد مرحله بررسی شد.\nکد عضویت شما: TEST-1");
  assert.equal(effectiveClubSettings({ club: c, localSettings: { ...FALLBACK_CLUB_SMS, prize5: "هدیه ویژه" } }).source, "phone");
  assert.equal(validateClubSettings({ ...FALLBACK_CLUB_SMS, smsPriced: "ab" }) !== null, true);
  assert.equal(validateClubSettings(FALLBACK_CLUB_SMS), null);
});

test("JSON backup carries club + phone edits; old files leave them alone; no secrets in the section", () => {
  const referral = { club: parseReferralClub(club), localSettings: { ...FALLBACK_CLUB_SMS, prize10: "جایزه گوشی" } };
  const file = JSON.stringify({ format: "kasbokar-pocket", schemaVersion: 3, bookings: [], referral });
  const parsed = parsePocketBackup(file);
  assert.equal(parsed.referral?.localSettings?.prize10, "جایزه گوشی");
  assert.ok(!/token|secret|license|password|cookie/i.test(JSON.stringify(parsed.referral)));
  const local = parsePocketBackup(JSON.stringify({ schemaVersion: 3, bookings: [] }));
  assert.equal(local.referral, undefined);
  assert.equal(mergeBackup({ ...local, referral: { club: null, localSettings: null } }, local).referral?.club, null, "old file keeps phone state");
  assert.equal(mergeBackup({ ...local, referral: { club: null, localSettings: null } }, parsed).referral?.club?.members.length, 1);
});
