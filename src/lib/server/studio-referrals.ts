import { z } from "zod";
import type { Sql } from "../db.ts";
import { isIranMobile, normalizeIranPhone } from "../format.ts";

const PRIZE5 = "یک طرح مینیمال تا ۱۲ سانتی‌متر";
const PRIZE10 = "یک طرح تا ۲۶ سانتی‌متر";

const DEFAULT_SMS = {
  submitted: "یکی از دوستانی که با کد معرف شما درخواست داده، وارد مرحله بررسی شد.",
  priced: "برای یکی از معرفی‌های شما قیمت و شرایط مشخص شد.",
  booked: "یک معرفی موفق برای شما ثبت شد. اکنون {count} معرفی موفق از ۱۰ معرفی دارید.",
  prize5: "تبریک! شما ۵ معرفی موفق دارید. جایزه شما فعال شد: {prize}. برای هماهنگی ثبت نوبت از پنل خود اقدام کنید.",
  prize10: "تبریک! شما ۱۰ معرفی موفق دارید. جایزه دوم شما فعال شد: {prize}.",
};

const FA_STEM: Record<string, string> = {
  آ: "A", ا: "A", ب: "B", پ: "P", ت: "T", ث: "S", ج: "J", چ: "CH", ح: "H", خ: "KH",
  د: "D", ذ: "Z", ر: "R", ز: "Z", ژ: "ZH", س: "S", ش: "SH", ص: "S", ض: "Z", ط: "T", ظ: "Z",
  ع: "A", غ: "GH", ف: "F", ق: "GH", ک: "K", گ: "G", ل: "L", م: "M", ن: "N", و: "V", ه: "H", ی: "Y",
  ي: "Y", ك: "K", ة: "H", ئ: "Y", ؤ: "V",
};

export function referralProgress(input: { status: string; paymentStatus: string }) {
  const booked = input.status === "booked" && input.paymentStatus === "approved";
  const closed = !booked && (input.status === "rejected" || input.paymentStatus === "expired");
  const receipt = booked || input.paymentStatus === "receipt_submitted" || input.paymentStatus === "approved";
  const timeOk = receipt || input.paymentStatus === "awaiting_payment" || input.paymentStatus === "rejected";
  const priced = timeOk || input.paymentStatus === "proposal_pending" || input.status === "approved";
  const reviewed = priced || input.status === "needs_info";
  const steps = [
    { key: "submitted", label: "ثبت درخواست", done: true },
    { key: "reviewed", label: "بررسی", done: reviewed },
    { key: "priced", label: "قیمت اعلام شد", done: priced },
    { key: "time", label: "تأیید زمان", done: timeOk },
    { key: "paid", label: "پرداخت", done: receipt },
    { key: "receipt", label: "تأیید رسید", done: booked },
    { key: "booked", label: "نوبت نهایی", done: booked },
  ];
  const stage = booked ? "booked" : closed ? "closed" : [...steps].reverse().find((step) => step.done)?.key || "submitted";
  const publicLabel = booked
    ? "نوبت قطعی شد"
    : closed
      ? "به نتیجه نرسید"
      : input.paymentStatus === "rejected"
        ? "رسید تأیید نشد"
        : stage === "paid"
          ? "رسید در بررسی"
          : stage === "time"
            ? "زمان تأیید شد"
            : stage === "priced"
              ? "قیمت اعلام شد"
              : "در حال بررسی";
  return { steps, stage, successful: booked, publicLabel };
}

function faCount(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function fillTemplate(text: string, count: number, prize: string) {
  return text.replaceAll("{count}", faCount(count)).replaceAll("{prize}", prize);
}

function phoneKey(value: string) {
  const phone = normalizeIranPhone(value || "");
  return isIranMobile(phone) ? phone : "";
}

async function ensureTables(sql: Sql) {
  await sql.query(
    `create table if not exists studio_referrers (
      id text primary key,
      user_id text,
      name text not null,
      phone text not null unique,
      code text not null unique,
      active boolean not null default true,
      tier text not null default 'active',
      created_at timestamptz not null default now()
    )`,
  );
  await sql.query(
    `create table if not exists studio_referrals (
      id text primary key,
      referrer_id text not null,
      request_id text not null unique,
      referred_phone text not null unique,
      stage text not null default 'submitted',
      successful boolean not null default false,
      override_success boolean,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`,
  );
  await sql.query(
    `create table if not exists studio_referral_rewards (
      id text primary key,
      referrer_id text not null,
      milestone int not null,
      title text not null,
      status text not null default 'active',
      used_at timestamptz,
      unique (referrer_id, milestone)
    )`,
  );
  await sql.query(
    `create table if not exists studio_referral_settings (
      id text primary key,
      prize5 text not null,
      prize10 text not null,
      sms_submitted text not null,
      sms_priced text not null,
      sms_booked text not null,
      sms_prize5 text not null,
      sms_prize10 text not null
    )`,
  );
  await sql.query(
    `insert into studio_referral_settings (id, prize5, prize10, sms_submitted, sms_priced, sms_booked, sms_prize5, sms_prize10)
     values ('main',$1,$2,$3,$4,$5,$6,$7)
     on conflict (id) do nothing`,
    [PRIZE5, PRIZE10, DEFAULT_SMS.submitted, DEFAULT_SMS.priced, DEFAULT_SMS.booked, DEFAULT_SMS.prize5, DEFAULT_SMS.prize10],
  );
  await sql.query(
    `create table if not exists studio_referral_outbox (
      id text primary key,
      referrer_id text not null,
      referral_id text,
      phone text not null,
      kind text not null,
      body text not null,
      created_at timestamptz not null default now(),
      sent_at timestamptz
    )`,
  );
}

async function settings(sql: Sql) {
  await ensureTables(sql);
  const rows = await sql.query<{
    prize5: string;
    prize10: string;
    sms_submitted: string;
    sms_priced: string;
    sms_booked: string;
    sms_prize5: string;
    sms_prize10: string;
  }>(`select prize5, prize10, sms_submitted, sms_priced, sms_booked, sms_prize5, sms_prize10 from studio_referral_settings where id='main'`);
  const row = rows[0];
  if (!row) throw new Error("تنظیم باشگاه پیدا نشد.");
  return row;
}

async function notifyAdmins(sql: Sql, title: string, body: string) {
  const admins = await sql.query<{ user_id: string }>("select user_id from profiles where is_admin = true");
  for (const admin of admins) {
    await sql.query(
      `insert into notifications (id, user_id, title, body, kind) values ($1,$2,$3,$4,'referral')`,
      [crypto.randomUUID(), admin.user_id, title, body],
    );
  }
}

async function queueSms(sql: Sql, referrerId: string, referralId: string | null, phone: string, kind: string, body: string) {
  const existing = await sql.query<{ id: string }>(
    `select id from studio_referral_outbox where referrer_id=$1 and kind=$2 and coalesce(referral_id,'')=coalesce($3,'') limit 1`,
    [referrerId, kind, referralId],
  );
  if (existing[0]) return;
  await sql.query(
    `insert into studio_referral_outbox (id, referrer_id, referral_id, phone, kind, body) values ($1,$2,$3,$4,$5,$6)`,
    [crypto.randomUUID(), referrerId, referralId, phone, kind, body],
  );
}

function codeStem(name: string) {
  const latin = name.normalize("NFKD").replace(/[^a-zA-Z]/g, "").toUpperCase();
  if (latin.length >= 2) return latin.slice(0, 8);
  let folded = "";
  for (const char of name) {
    folded += FA_STEM[char] || "";
    if (folded.length >= 8) break;
  }
  return (folded || "REF").slice(0, 8);
}

function makeCode(name: string) {
  return `${codeStem(name)}-${1000 + Math.floor(Math.random() * 9000)}`;
}

async function freshCode(sql: Sql, name: string) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = attempt < 5 ? makeCode(name) : `REF-${100000 + Math.floor(Math.random() * 900000)}`;
    const taken = await sql.query<{ id: string }>(`select id from studio_referrers where upper(code)=$1 limit 1`, [code]);
    if (!taken[0]) return code;
  }
  return `REF-${100000 + Math.floor(Math.random() * 900000)}`;
}

export async function attachReferral(
  sql: Sql,
  input: { requestId: string; customerName: string; customerPhone: string; customerPhone2?: string | null; customerUserId?: string | null; code?: string },
) {
  try {
    return await attachReferralInner(sql, input);
  } catch (error) {
    console.error("[referral] attach failed", error);
    return { attached: false as const, note: "" };
  }
}

async function attachReferralInner(
  sql: Sql,
  input: { requestId: string; customerName: string; customerPhone: string; customerPhone2?: string | null; customerUserId?: string | null; code?: string },
) {
  const raw = (input.code || "").trim().toUpperCase();
  if (!raw) return { attached: false as const, note: "" };
  await ensureTables(sql);
  const phone = phoneKey(input.customerPhone);
  const phone2 = phoneKey(input.customerPhone2 || "");
  const referrers = await sql.query<{ id: string; phone: string; name: string; active: boolean; tier: string; user_id: string | null }>(
    `select id, phone, name, active, tier, user_id from studio_referrers where upper(code)=$1 limit 1`,
    [raw],
  );
  const referrer = referrers[0];
  if (!referrer || !referrer.active || referrer.tier === "inactive" || referrer.tier === "limited") {
    return { attached: false as const, note: "کد معرف پیدا نشد. درخواست بدون کد ثبت شد." };
  }
  const referrerPhone = phoneKey(referrer.phone);
  if ((phone && referrerPhone === phone) || (phone2 && referrerPhone === phone2) || (input.customerUserId && referrer.user_id === input.customerUserId)) {
    return { attached: false as const, note: "کد معرف خودتان قابل استفاده نیست. درخواست بدون امتیاز ثبت شد." };
  }
  const keys = [phone, phone2].filter(Boolean);
  const taken = await sql.query<{ id: string }>(
    `select id from studio_referrals
      where request_id=$1
         or referred_phone = any($2::text[])
      limit 1`,
    [input.requestId, keys.length ? keys : ["__none__"]],
  );
  if (taken[0]) return { attached: false as const, note: "این شماره قبلاً یک معرف دارد. معرف عوض نشد." };
  if (keys.length) {
    const prior = await sql.query<{ id: string }>(
      `select r.id
         from tattoo_requests t
         join studio_referrals r on r.request_id = t.id
        where t.id <> $2
          and (
            right(regexp_replace(t.customer_phone, '\\D', '', 'g'), 10) = any($1::text[])
            or right(regexp_replace(coalesce(t.customer_phone_2, ''), '\\D', '', 'g'), 10) = any($1::text[])
          )
        limit 1`,
      [keys.map((item) => item.slice(-10)), input.requestId],
    );
    if (prior[0]) return { attached: false as const, note: "این شماره قبلاً یک معرف دارد. معرف عوض نشد." };
  }
  const id = crypto.randomUUID();
  await sql.query(
    `insert into studio_referrals (id, referrer_id, request_id, referred_phone, stage) values ($1,$2,$3,$4,'submitted')`,
    [id, referrer.id, input.requestId, phone || phone2],
  );
  const config = await settings(sql);
  await queueSms(sql, referrer.id, id, referrer.phone, "submitted", config.sms_submitted);
  await notifyAdmins(sql, "معرفی جدید", `${input.customerName} با کد ${raw} درخواست داد. هنوز امتیاز حساب نشده.`);
  return { attached: true as const, note: "" };
}

async function rewardState(sql: Sql, referrerId: string, count: number, phone: string, name: string) {
  const config = await settings(sql);
  for (const milestone of [5, 10] as const) {
    const title = milestone === 5 ? config.prize5 : config.prize10;
    if (count >= milestone) {
      const existing = await sql.query<{ id: string }>(
        `select id from studio_referral_rewards where referrer_id=$1 and milestone=$2`,
        [referrerId, milestone],
      );
      if (!existing[0]) {
        await sql.query(
          `insert into studio_referral_rewards (id, referrer_id, milestone, title, status) values ($1,$2,$3,$4,'active')`,
          [crypto.randomUUID(), referrerId, milestone, title],
        );
        const kind = milestone === 5 ? "prize5" : "prize10";
        await queueSms(
          sql,
          referrerId,
          null,
          phone,
          kind,
          fillTemplate(milestone === 5 ? config.sms_prize5 : config.sms_prize10, count, title),
        );
        await notifyAdmins(sql, "جایزه باشگاه فعال شد", `${name} به ${faCount(milestone)} معرفی موفق رسید و جایزه او فعال شد: ${title}`);
      }
    } else {
      await sql.query(
        `delete from studio_referral_rewards where referrer_id=$1 and milestone=$2 and status='active'`,
        [referrerId, milestone],
      );
    }
  }
}

export async function syncReferralRequest(sql: Sql, requestId: string) {
  try {
    await applyReferralSync(sql, requestId);
  } catch (error) {
    console.error("[referral] sync failed", error);
  }
}

async function applyReferralSync(sql: Sql, requestId: string) {
  await ensureTables(sql);
  const rows = await sql.query<{
    id: string;
    referrer_id: string;
    stage: string;
    successful: boolean;
    override_success: boolean | null;
    referrer_name: string;
    referrer_phone: string;
    referrer_code: string;
    customer_name: string | null;
    status: string | null;
    payment_status: string | null;
  }>(
    `select r.id, r.referrer_id, r.stage, r.successful, r.override_success, f.name as referrer_name, f.phone as referrer_phone, f.code as referrer_code,
            t.customer_name, t.status, t.payment_status
       from studio_referrals r
       join studio_referrers f on f.id = r.referrer_id
       left join tattoo_requests t on t.id = r.request_id
      where r.request_id=$1`,
    [requestId],
  );
  const row = rows[0];
  if (!row) return;
  const progress = row.status
    ? referralProgress({ status: row.status, paymentStatus: row.payment_status || "" })
    : { stage: "closed", successful: false, publicLabel: "به نتیجه نرسید", steps: [] };
  const successful = row.override_success == null ? progress.successful : row.override_success;
  const stage = row.override_success === false ? "closed" : row.override_success === true && progress.stage === "closed" ? "booked" : progress.stage;
  const changed = stage !== row.stage || successful !== row.successful;
  if (changed) {
    await sql.query(
      `update studio_referrals set stage=$2, successful=$3, updated_at=now() where id=$1`,
      [row.id, stage, successful],
    );
  }
  const config = await settings(sql);
  const countRows = await sql.query<{ total: number }>(
    `select count(*)::int as total from studio_referrals where referrer_id=$1 and successful=true`,
    [row.referrer_id],
  );
  const count = Number(countRows[0]?.total) || 0;
  const pricedNow = stage === "priced" || stage === "time" || stage === "paid" || stage === "booked";
  const pricedBefore = row.stage === "priced" || row.stage === "time" || row.stage === "paid" || row.stage === "booked";
  if (changed && pricedNow && !pricedBefore) {
    await queueSms(sql, row.referrer_id, row.id, row.referrer_phone, "priced", config.sms_priced);
  }
  if (changed && !row.successful && successful) {
    await queueSms(sql, row.referrer_id, row.id, row.referrer_phone, "booked", fillTemplate(config.sms_booked, count, ""));
    const who = row.customer_name || "یک مشتری";
    await notifyAdmins(sql, "معرفی موفق", `${who} که با کد ${row.referrer_code} معرفی شده بود، نوبت خود را قطعی کرد.`);
  }
  await rewardState(sql, row.referrer_id, count, row.referrer_phone, row.referrer_name);
}

async function phonesForUser(sql: Sql, userId: string) {
  const rows = await sql.query<{ customer_phone: string; customer_phone_2: string | null }>(
    `select customer_phone, customer_phone_2 from tattoo_requests where customer_id=$1`,
    [userId],
  );
  const phones = new Set<string>();
  for (const row of rows) {
    for (const value of [row.customer_phone, row.customer_phone_2]) {
      const phone = phoneKey(value || "");
      if (phone) phones.add(phone);
    }
  }
  return phones;
}

export async function performMyReferralClub(sql: Sql, userId: string, raw: unknown) {
  await ensureTables(sql);
  const asked = z.object({ phone: z.string().max(20).optional() }).parse(raw ?? {});
  const owned = await phonesForUser(sql, userId);
  const typed = phoneKey(asked.phone || "");
  const lookup = [...owned];
  if (typed && !lookup.includes(typed)) lookup.push(typed);
  const rows = await sql.query<{
    id: string;
    name: string;
    code: string;
    active: boolean;
    tier: string;
    phone: string;
    user_id: string | null;
  }>(
    `select id, name, code, active, tier, phone, user_id from studio_referrers
      where user_id=$1 or phone = any($2::text[])
      order by case when user_id=$1 then 0 else 1 end, created_at desc
      limit 1`,
    [userId, lookup.length ? lookup : ["__none__"]],
  );
  const member = rows[0];
  const ownsPhone = Boolean(member && owned.has(phoneKey(member.phone)));
  if (!member || !member.active || member.tier === "inactive") return { member: false as const };
  if (member.user_id && member.user_id !== userId && !ownsPhone) return { member: false as const };
  if (!member.user_id || ownsPhone) {
    await sql.query(`update studio_referrers set user_id=$2 where id=$1`, [member.id, userId]);
  }
  const links = await sql.query<{ request_id: string }>(`select request_id from studio_referrals where referrer_id=$1`, [member.id]);
  for (const link of links) await syncReferralRequest(sql, link.request_id);
  const referrals = await sql.query<{ stage: string; successful: boolean; status: string | null; payment_status: string | null }>(
    `select r.stage, r.successful, t.status, t.payment_status
       from studio_referrals r
       left join tattoo_requests t on t.id = r.request_id
      where r.referrer_id=$1
      order by r.created_at`,
    [member.id],
  );
  const config = await settings(sql);
  const rewards = await sql.query<{ milestone: number; title: string; status: string }>(
    `select milestone, title, status from studio_referral_rewards where referrer_id=$1`,
    [member.id],
  );
  const successCount = referrals.filter((row) => row.successful).length;
  return {
    member: true as const,
    code: member.code,
    accepting: member.tier !== "limited",
    successCount,
    referrals: referrals.map((row, index) => {
      const progress = row.status ? referralProgress({ status: row.status, paymentStatus: row.payment_status || "" }) : null;
      const closed = !row.status || progress?.stage === "closed";
      return {
        label: `معرفی ${faCount(index + 1)}`,
        state: row.successful ? "نوبت قطعی شد" : closed ? "به نتیجه نرسید" : progress?.publicLabel || "در حال بررسی",
        done: row.successful,
      };
    }),
    prizes: [5, 10].map((milestone) => {
      const saved = rewards.find((reward) => reward.milestone === milestone);
      return {
        milestone,
        title: saved?.title || (milestone === 5 ? config.prize5 : config.prize10),
        status: saved ? (saved.status === "used" ? "استفاده شد" : "فعال شد") : "در انتظار تکمیل",
        ready: Boolean(saved),
      };
    }),
  };
}

function rewardLabel(rows: { milestone: number; status: string }[]) {
  const ready = rows.filter((row) => row.status === "active").map((row) => faCount(row.milestone));
  return ready.length ? `جایزه ${ready.join(" و ")}` : "—";
}

export async function performReferralDesk(sql: Sql) {
  await ensureTables(sql);
  const links = await sql.query<{ request_id: string }>(`select request_id from studio_referrals`);
  for (const link of links) await syncReferralRequest(sql, link.request_id);
  const referrers = await sql.query<{
    id: string;
    name: string;
    phone: string;
    code: string;
    active: boolean;
    tier: string;
    created_at: string;
    total: number;
    successful: number;
    pending: number;
  }>(
    `select f.id, f.name, f.phone, f.code, f.active, f.tier, f.created_at,
            count(r.id)::int as total,
            count(r.id) filter (where r.successful)::int as successful,
            count(r.id) filter (where r.successful = false and r.stage <> 'closed')::int as pending
       from studio_referrers f
       left join studio_referrals r on r.referrer_id = f.id
      group by f.id
      order by f.created_at desc`,
  );
  const rewards = await sql.query<{ referrer_id: string; milestone: number; status: string }>(
    `select referrer_id, milestone, status from studio_referral_rewards`,
  );
  const pending = await sql.query<{ total: number }>(
    `select count(*)::int as total from studio_referrals where successful=false and stage <> 'closed'`,
  );
  const success = await sql.query<{ total: number }>(`select count(*)::int as total from studio_referrals where successful=true`);
  const config = await settings(sql);
  const outbox = await sql.query<{ id: string; phone: string; body: string; referrer_id: string }>(
    `select id, phone, body, referrer_id from studio_referral_outbox where sent_at is null order by created_at desc limit 20`,
  );
  return {
    summary: {
      members: referrers.length,
      active: referrers.filter((row) => row.active && row.tier !== "inactive").length,
      pending: Number(pending[0]?.total) || 0,
      successful: Number(success[0]?.total) || 0,
      prizesActive: rewards.filter((row) => row.status === "active").length,
      prizesUsed: rewards.filter((row) => row.status === "used").length,
    },
    settings: {
      prize5: config.prize5,
      prize10: config.prize10,
      smsSubmitted: config.sms_submitted,
      smsPriced: config.sms_priced,
      smsBooked: config.sms_booked,
      smsPrize5: config.sms_prize5,
      smsPrize10: config.sms_prize10,
    },
    outbox,
    referrers: referrers.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      code: row.code,
      active: row.active,
      tier: row.tier,
      total: Number(row.total) || 0,
      successful: Number(row.successful) || 0,
      pending: Number(row.pending) || 0,
      reward: rewardLabel(rewards.filter((item) => item.referrer_id === row.id)),
      createdAt: row.created_at,
    })),
  };
}

export async function performReferralFile(sql: Sql, raw: unknown) {
  const data = z.object({ id: z.string().min(4) }).parse(raw);
  await ensureTables(sql);
  const referrers = await sql.query<{
    id: string;
    name: string;
    phone: string;
    code: string;
    active: boolean;
    tier: string;
    created_at: string;
  }>(`select id, name, phone, code, active, tier, created_at from studio_referrers where id=$1`, [data.id]);
  const referrer = referrers[0];
  if (!referrer) throw new Error("این عضو پیدا نشد.");
  const links = await sql.query<{ request_id: string }>(`select request_id from studio_referrals where referrer_id=$1`, [referrer.id]);
  for (const link of links) await syncReferralRequest(sql, link.request_id);
  const referrals = await sql.query<{
    id: string;
    stage: string;
    successful: boolean;
    referred_phone: string;
    created_at: string;
    status: string | null;
    payment_status: string | null;
    override_success: boolean | null;
  }>(
    `select r.id, r.stage, r.successful, r.referred_phone, r.created_at, r.override_success, t.status, t.payment_status
       from studio_referrals r
       left join tattoo_requests t on t.id = r.request_id
      where r.referrer_id=$1
      order by r.created_at`,
    [referrer.id],
  );
  const rewards = await sql.query<{ milestone: number; title: string; status: string }>(
    `select milestone, title, status from studio_referral_rewards where referrer_id=$1 order by milestone`,
    [referrer.id],
  );
  return {
    referrer,
    rewards,
    referrals: referrals.map((row) => {
      const progress = row.status
        ? referralProgress({ status: row.status, paymentStatus: row.payment_status || "" })
        : referralProgress({ status: "rejected", paymentStatus: "expired" });
      const successful = row.override_success === null ? progress.successful : row.override_success;
      return {
        id: row.id,
        phone: row.referred_phone,
        successful,
        closed: !successful && (row.override_success === false || progress.stage === "closed" || !row.status),
        override: row.override_success,
        createdAt: row.created_at,
        steps: progress.steps.map((step) => ({ ...step, done: successful && step.key === "booked" ? true : step.done })),
      };
    }),
  };
}

const memberSchema = z.object({
  phone: z.string().trim().min(10).max(20),
  name: z.string().trim().min(2).max(80),
  active: z.boolean(),
  tier: z.enum(["vip", "active", "limited", "inactive"]),
  code: z.string().trim().max(20).optional(),
});

export async function performSetReferralMember(sql: Sql, raw: unknown) {
  const data = memberSchema.parse(raw);
  const phone = normalizeIranPhone(data.phone);
  if (!isIranMobile(phone)) throw new Error("شماره موبایل درست نیست.");
  await ensureTables(sql);
  const existing = await sql.query<{ id: string; code: string }>(`select id, code from studio_referrers where phone=$1`, [phone]);
  const code = (data.code || existing[0]?.code || await freshCode(sql, data.name)).trim().toUpperCase();
  if (!/^[A-Z0-9]{2,12}-\d{3,6}$/.test(code)) throw new Error("کد معرف باید مثل PEYMAN-2847 باشد.");
  try {
    if (existing[0]) {
      await sql.query(
        `update studio_referrers set name=$2, active=$3, tier=$4, code=$5 where id=$1`,
        [existing[0].id, data.name, data.active, data.tier, code],
      );
      return { id: existing[0].id, code };
    }
    const id = crypto.randomUUID();
    await sql.query(
      `insert into studio_referrers (id, name, phone, code, active, tier) values ($1,$2,$3,$4,$5,$6)`,
      [id, data.name, phone, code, data.active, data.tier],
    );
    return { id, code };
  } catch (error) {
    if (/unique|duplicate/i.test(error instanceof Error ? error.message : "")) {
      throw new Error("این کد معرف برای شخص دیگری است. کد دیگری بگذار.");
    }
    throw error;
  }
}

export async function performSetReferralOverride(sql: Sql, raw: unknown) {
  const data = z.object({
    id: z.string().min(4),
    success: z.boolean().nullable(),
  }).parse(raw);
  await ensureTables(sql);
  const rows = await sql.query<{ request_id: string }>(`select request_id from studio_referrals where id=$1`, [data.id]);
  if (!rows[0]) throw new Error("این معرفی پیدا نشد.");
  await sql.query(`update studio_referrals set override_success=$2, updated_at=now() where id=$1`, [data.id, data.success]);
  await syncReferralRequest(sql, rows[0].request_id);
  return { ok: true as const };
}

export async function performSetReferralReward(sql: Sql, raw: unknown) {
  const data = z.object({
    referrerId: z.string().min(4),
    milestone: z.union([z.literal(5), z.literal(10)]),
    status: z.enum(["active", "used"]),
  }).parse(raw);
  await ensureTables(sql);
  const config = await settings(sql);
  const title = data.milestone === 5 ? config.prize5 : config.prize10;
  await sql.query(
    `insert into studio_referral_rewards (id, referrer_id, milestone, title, status, used_at)
     values ($1,$2,$3,$4,$5, case when $5='used' then now() else null end)
     on conflict (referrer_id, milestone) do update set status=excluded.status, title=excluded.title,
       used_at=case when excluded.status='used' then now() else null end`,
    [crypto.randomUUID(), data.referrerId, data.milestone, title, data.status],
  );
  return { ok: true as const };
}

export async function performSaveReferralSettings(sql: Sql, raw: unknown) {
  const data = z.object({
    prize5: z.string().trim().min(4).max(160),
    prize10: z.string().trim().min(4).max(160),
    smsSubmitted: z.string().trim().min(4).max(320),
    smsPriced: z.string().trim().min(4).max(320),
    smsBooked: z.string().trim().min(4).max(320),
    smsPrize5: z.string().trim().min(4).max(320),
    smsPrize10: z.string().trim().min(4).max(320),
  }).parse(raw);
  await ensureTables(sql);
  await sql.query(
    `update studio_referral_settings
        set prize5=$1, prize10=$2, sms_submitted=$3, sms_priced=$4, sms_booked=$5, sms_prize5=$6, sms_prize10=$7
      where id='main'`,
    [data.prize5, data.prize10, data.smsSubmitted, data.smsPriced, data.smsBooked, data.smsPrize5, data.smsPrize10],
  );
  return { ok: true as const };
}

export async function performMarkReferralSms(sql: Sql, raw: unknown) {
  const data = z.object({ id: z.string().min(4) }).parse(raw);
  await ensureTables(sql);
  await sql.query(`update studio_referral_outbox set sent_at=now() where id=$1`, [data.id]);
  return { ok: true as const };
}
