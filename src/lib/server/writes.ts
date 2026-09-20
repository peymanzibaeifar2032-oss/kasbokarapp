import { z } from "zod";
import { DEFAULT_HOURS } from "@/lib/data/catalog";
import { getSql } from "@/lib/db";
import { env } from "@/lib/env.server";
import { isIranMobile, normalizeIranPhone, parseToman, toWebsiteHref } from "@/lib/format";
import { shouldGrantBootstrapAdmin, isOccupancyConflict } from "@/lib/server/admin-bootstrap";
import { buildSlots, DEFAULT_BOOKING_HORIZON_DAYS, serviceBuffers, serviceDurationMinutes, tehranDayKey } from "@/lib/hours";
import {
  RESOURCE_KINDS,
  assignResourceAtIso,
  eligibleResources,
  filterOccupancy,
  hasActiveResources,
  persistableResourceId,
  resolveRescheduleResource,
  slotsForResource,
  type BusinessResource,
  type OccupancyHit,
} from "@/lib/calendar/resources";
import { deriveVerificationLevel, nextVerificationLevel, type VerificationLevel } from "@/lib/search/verification";
import { shouldBumpRankingFresh } from "@/lib/search/ranking";
import {
  ACTIVE_OCCUPANCY_SQL,
  BOOKING_SELECT,
  BIZ_SELECT,
  VISIBLE_SQL,
  mapBooking,
  mapBusiness,
  mapCategory,
  mapReview,
  type BookingRow,
  type BizRow,
  type ReviewRow,
} from "@/lib/server/db-map";
import type { MehrLoanLead, OwnerStats, PriceItem, Profile, TattooRequest, WorkHour } from "@/lib/types";

const hoursSchema = z.array(
  z.object({
    day: z.string(),
    open: z.string(),
    close: z.string(),
    closed: z.boolean().optional(),
    shifts: z.array(z.object({ open: z.string(), close: z.string() })).optional(),
  }),
);

const pricesSchema = z.array(
  z.object({
    title: z.string(),
    price: z.preprocess((v) => {
      if (typeof v === "number") return Number.isFinite(v) ? v : 0;
      if (typeof v === "string") return parseToman(v);
      return 0;
    }, z.number().nonnegative()),
    minutes: z.number().int().min(10).max(4320).optional(),
    bufferBefore: z.number().int().min(0).max(180).optional(),
    bufferAfter: z.number().int().min(0).max(180).optional(),
    depositType: z.enum(["none", "fixed", "percent"]).optional(),
    depositAmount: z.number().min(0).optional(),
    depositPercent: z.number().min(0).max(100).optional(),
  }),
);

const businessInput = z.object({
  name: z.string().min(2).max(80),
  jobTitle: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  province: z.string().min(2),
  city: z.string().min(2),
  address: z.string().max(200).optional(),
  latitude: z.number(),
  longitude: z.number(),
  categoryId: z.number(),
  description: z.string().max(800).optional(),
  instagram: z.string().max(80).optional(),
  whatsapp: z.string().max(40).optional(),
  website: z.string().max(120).optional(),
  workHours: hoursSchema.optional(),
  slotMinutes: z.number().min(10).max(4320).optional(),
  prices: pricesSchema.optional(),
  offerText: z.string().max(80).optional(),
});

async function requireAdmin(userId: string) {
  const sql = await getSql();
  const me = await sql.query<{ is_admin: boolean }>("select is_admin from profiles where user_id = $1", [userId]);
  if (!me[0]?.is_admin) throw new Error("دسترسی مدیریت ندارید.");
}

async function hasMehrLoanAccess(userId: string) {
  const sql = await getSql();
  const rows = await sql.query<{ allowed: boolean }>(
    `select exists (
       select 1 from profiles where user_id = $1 and is_admin = true
       union all
       select 1 from mehr_loan_admins where user_id = $1
     ) as allowed`,
    [userId],
  );
  return Boolean(rows[0]?.allowed);
}

async function requireMehrLoanAccess(userId: string) {
  if (!(await hasMehrLoanAccess(userId))) {
    throw new Error("دسترسی پنل وام فعال نیست.");
  }
}

type MehrLoanLeadRow = {
  id: string;
  tracking_code: string;
  full_name: string;
  phone: string;
  request_type: MehrLoanLead["requestType"];
  score_amount_toman: string | number | null;
  repayment_months: number | null;
  branch_code: string | null;
  province: string | null;
  county: string | null;
  description: string | null;
  status: MehrLoanLead["status"];
  created_at: string;
  updated_at: string;
};

function mapMehrLoanLead(row: MehrLoanLeadRow): MehrLoanLead {
  return {
    id: row.id,
    trackingCode: row.tracking_code,
    fullName: row.full_name,
    phone: row.phone,
    requestType: row.request_type,
    scoreAmountToman: row.score_amount_toman == null ? null : Number(row.score_amount_toman),
    repaymentMonths: row.repayment_months == null ? null : Number(row.repayment_months),
    branchCode: row.branch_code,
    province: row.province,
    county: row.county,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function performMehrLoanLeads(userId: string) {
  await requireMehrLoanAccess(userId);
  const sql = await getSql();
  const rows = await sql.query<MehrLoanLeadRow>(
    `select id, tracking_code, request_type, full_name, phone, score_amount_toman, repayment_months,
            branch_code, province, county, description, status, created_at, updated_at
       from mehr_loan_leads
      order by case status when 'reviewing' then 0 when 'contacted' then 1 when 'purchased' then 2 else 3 end,
               created_at desc`,
  );
  return rows.map(mapMehrLoanLead);
}

async function performUpdateMehrLoanLead(userId: string, raw: unknown) {
  await requireMehrLoanAccess(userId);
  const data = z.object({
    id: z.string().uuid(),
    status: z.enum(["reviewing", "contacted", "purchased", "rejected"]),
  }).parse(raw);
  const sql = await getSql();
  const rows = await sql.query<{ id: string }>(
    `update mehr_loan_leads set status = $2, updated_at = now() where id = $1 returning id`,
    [data.id, data.status],
  );
  if (!rows[0]) throw new Error("درخواست پیدا نشد.");
  return { ok: true as const };
}

type TattooRequestRow = {
  id: string;
  customer_id: string;
  business_id: string | null;
  booking_id: string | null;
  customer_name: string;
  customer_phone: string;
  request_type: "new" | "coverup" | "consultation";
  style: string;
  idea: string;
  placement: string;
  size_cm: string;
  preferred_dates: string | null;
  budget_toman: number | null;
  reference_images: unknown;
  body_images: unknown;
  status: TattooRequest["status"];
  price_min_toman: number | null;
  price_max_toman: number | null;
  session_minutes: number | null;
  session_count: number | null;
  deposit_toman: number | null;
  artist_message: string | null;
  payment_status: TattooRequest["paymentStatus"];
  payment_hold_until: string | null;
  payment_submitted_at: string | null;
  payment_review_deadline: string | null;
  receipt_image: string | null;
  payment_iban: string | null;
  payment_card_number: string | null;
  proposed_slot_start: string | null;
  proposed_slot_end: string | null;
  created_at: string;
  updated_at: string;
};

function mapTattooRequest(row: TattooRequestRow): TattooRequest {
  const images = (value: unknown) => Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
  return {
    id: row.id,
    customerId: row.customer_id,
    businessId: row.business_id,
    bookingId: row.booking_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    requestType: row.request_type,
    style: row.style,
    idea: row.idea,
    placement: row.placement,
    sizeCm: row.size_cm,
    preferredDates: row.preferred_dates,
    budgetToman: row.budget_toman == null ? null : Number(row.budget_toman),
    referenceImages: images(row.reference_images),
    bodyImages: images(row.body_images),
    status: row.status,
    priceMinToman: row.price_min_toman == null ? null : Number(row.price_min_toman),
    priceMaxToman: row.price_max_toman == null ? null : Number(row.price_max_toman),
    sessionMinutes: row.session_minutes == null ? null : Number(row.session_minutes),
    sessionCount: row.session_count == null ? null : Number(row.session_count),
    depositToman: row.deposit_toman == null ? null : Number(row.deposit_toman),
    artistMessage: row.artist_message,
    paymentStatus: row.payment_status,
    paymentHoldUntil: row.payment_hold_until,
    paymentSubmittedAt: row.payment_submitted_at,
    paymentReviewDeadline: row.payment_review_deadline,
    receiptImage: row.receipt_image,
    paymentIban: row.payment_iban,
    paymentCardNumber: row.payment_card_number,
    proposedSlotStart: row.proposed_slot_start,
    proposedSlotEnd: row.proposed_slot_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const tattooRequestSelect = `select id, customer_id, business_id, booking_id, customer_name, customer_phone,
  request_type, style, idea, placement, size_cm, preferred_dates, budget_toman,
  reference_images, body_images, status, price_min_toman, price_max_toman,
  session_minutes, session_count, deposit_toman, artist_message, payment_status, payment_hold_until,
  payment_submitted_at, payment_review_deadline, receipt_image, payment_iban, payment_card_number,
  proposed_slot_start, proposed_slot_end, created_at, updated_at
  from tattoo_requests`;

const imageDataSchema = z.string().max(1_000_000).refine(
  (value) => /^data:image\/(jpeg|png|webp);base64,/i.test(value),
  "فرمت تصویر معتبر نیست.",
);

async function performCreateTattooRequest(userId: string, raw: unknown) {
  const data = z.object({
    customerName: z.string().trim().min(2, "نام را کامل بنویسید.").max(80),
    customerPhone: z.string().trim().max(40),
    requestType: z.enum(["new", "coverup", "consultation"]),
    style: z.string().trim().min(2, "سبک را انتخاب کنید.").max(80),
    idea: z.string().trim().min(10, "ایده را کمی کامل‌تر توضیح دهید.").max(1500),
    placement: z.string().trim().min(2, "محل اجرا را بنویسید.").max(120),
    sizeCm: z.string().trim().min(1, "اندازه تقریبی را بنویسید.").max(60),
    preferredDates: z.string().trim().max(200).optional(),
    budgetToman: z.number().int().min(0).max(2_000_000_000).optional().nullable(),
    referenceImages: z.array(imageDataSchema).max(3).default([]),
    bodyImages: z.array(imageDataSchema).max(2).default([]),
  }).parse(raw);
  const phone = normalizeIranPhone(data.customerPhone);
  if (!isIranMobile(phone)) throw new Error("شماره موبایل ایرانی معتبر وارد کنید.");
  const bytes = [...data.referenceImages, ...data.bodyImages].reduce((sum, value) => sum + value.length, 0);
  if (bytes > 3_500_000) throw new Error("حجم مجموع عکس‌ها زیاد است. عکس‌های کم‌حجم‌تر بفرستید.");
  const sql = await getSql();
  const id = crypto.randomUUID();
  await sql.query(
    `insert into tattoo_requests
      (id, customer_id, customer_name, customer_phone, request_type, style, idea, placement,
       size_cm, preferred_dates, budget_toman, reference_images, body_images)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb)`,
    [id, userId, data.customerName, phone, data.requestType, data.style, data.idea, data.placement,
      data.sizeCm, data.preferredDates || null, data.budgetToman ?? null,
      JSON.stringify(data.referenceImages), JSON.stringify(data.bodyImages)],
  );
  const admins = await sql.query<{ user_id: string }>("select user_id from profiles where is_admin = true");
  for (const admin of admins) {
    await notify(sql, admin.user_id, "درخواست جدید تاتو", `درخواست تازه از ${data.customerName} دریافت شد.`, "tattoo_request_new");
  }
  await notify(sql, userId, "درخواست تاتو ثبت شد", "درخواست شما برای بررسی پیمان زیبائی‌فر ارسال شد.", "tattoo_request_created");
  return { id };
}

async function performMyTattooRequests(userId: string) {
  const sql = await getSql();
  await sql.query(`update bookings set status='cancelled' where id in (select booking_id from tattoo_requests where customer_id=$1 and status='approved' and payment_status='awaiting_payment' and payment_hold_until is not null and payment_hold_until <= now()) and status='requested'`, [userId]);
  await sql.query(`update tattoo_requests set status='rejected', payment_status='expired', updated_at=now()
    where customer_id=$1 and status='approved' and payment_status='awaiting_payment'
      and payment_hold_until is not null and payment_hold_until <= now()`, [userId]);
  const rows = await sql.query<TattooRequestRow>(`${tattooRequestSelect} where customer_id = $1 order by created_at desc`, [userId]);
  return rows.map(mapTattooRequest);
}

async function performStudioTattooRequests(userId: string) {
  await requireAdmin(userId);
  const sql = await getSql();
  await sql.query(`update bookings set status='cancelled' where id in (select booking_id from tattoo_requests where status='approved' and payment_status='awaiting_payment' and payment_hold_until is not null and payment_hold_until <= now()) and status='requested'`);
  await sql.query(`update tattoo_requests set status='rejected', payment_status='expired', updated_at=now()
    where status='approved' and payment_status='awaiting_payment'
      and payment_hold_until is not null and payment_hold_until <= now()`);
  const rows = await sql.query<TattooRequestRow>(`${tattooRequestSelect} order by case status when 'submitted' then 0 when 'needs_info' then 1 when 'approved' then 2 else 3 end, created_at desc`);
  return rows.map(mapTattooRequest);
}

async function performDecideTattooRequest(userId: string, raw: unknown) {
  await requireAdmin(userId);
  const data = z.object({
    id: z.string(),
    status: z.enum(["needs_info", "approved", "rejected", "booked"]),
    businessId: z.string().optional().nullable(),
    priceMinToman: z.number().int().min(0).optional().nullable(),
    priceMaxToman: z.number().int().min(0).optional().nullable(),
    sessionMinutes: z.number().int().min(10).max(4320).optional().nullable(),
    sessionCount: z.number().int().min(1).max(20).optional().nullable(),
    depositToman: z.number().int().min(0).optional().nullable(),
    paymentIban: z.string().trim().max(34).optional().nullable(),
    paymentCardNumber: z.string().trim().max(24).optional().nullable(),
    proposedSlotStart: z.string().optional().nullable(),
    artistMessage: z.string().trim().min(2).max(1000),
  }).parse(raw);
  if (data.status === "approved" && (!data.businessId || data.priceMinToman == null || data.depositToman == null || !data.sessionMinutes || !data.proposedSlotStart)) {
    throw new Error("برای تأیید، کسب‌وکار، قیمت، بیعانه، مدت جلسه و زمان پیشنهادی را کامل کنید.");
  }
  const paymentIban = data.paymentIban?.replace(/\s/g, "").toUpperCase() || null;
  const paymentCardNumber = data.paymentCardNumber?.replace(/\D/g, "") || null;
  if (data.status === "approved" && (data.depositToman ?? 0) > 0 && !paymentIban && !paymentCardNumber) {
    throw new Error("برای دریافت بیعانه، شماره کارت یا شماره شبا را وارد کنید.");
  }
  if (paymentIban && !/^IR\d{24}$/.test(paymentIban)) throw new Error("شماره شبا معتبر نیست.");
  if (paymentCardNumber && !/^\d{16}$/.test(paymentCardNumber)) throw new Error("شماره کارت باید ۱۶ رقم باشد.");
  const sql = await getSql();
  if (data.businessId) {
    const owned = await sql.query<{ id: string }>("select id from businesses where id = $1 and owner_id = $2", [data.businessId, userId]);
    if (!owned[0]) throw new Error("کسب‌وکار انتخاب‌شده متعلق به شما نیست.");
  }
  let proposedStart: string | null = null;
  let proposedEnd: string | null = null;
  if (data.status === "approved") {
    const start = new Date(data.proposedSlotStart!);
    if (Number.isNaN(start.getTime()) || start.getTime() < Date.now() + 10 * 60000) throw new Error("زمان پیشنهادی معتبر نیست.");
    const end = new Date(start.getTime() + data.sessionMinutes! * 60000);
    const overlap = await sql.query<{ id: string }>(
      `select id from bookings where business_id=$1 and status in ('requested','confirmed') and slot_start < $3 and slot_end > $2 limit 1`,
      [data.businessId, start.toISOString(), end.toISOString()],
    );
    if (overlap[0]) throw new Error("این زمان قبلاً رزرو شده است. زمان دیگری انتخاب کنید.");
    proposedStart = start.toISOString();
    proposedEnd = end.toISOString();
  }
  const updated = await sql.query<{ customer_id: string }>(
    `update tattoo_requests set status=$2, business_id=$3, price_min_toman=$4, price_max_toman=$5,
       session_minutes=$6, session_count=$7, deposit_toman=$8, artist_message=$9,
       payment_status=case when $2='approved' then 'proposal_pending' else 'not_required' end,
       payment_hold_until=null,
       payment_submitted_at=null, payment_review_deadline=null, receipt_image=null,
       payment_iban=$10, payment_card_number=$11,
       proposed_slot_start=$12, proposed_slot_end=$13, booking_id=null, updated_at=now()
     where id=$1 returning customer_id`,
    [data.id, data.status, data.businessId ?? null, data.priceMinToman ?? null, data.priceMaxToman ?? null,
      data.sessionMinutes ?? null, data.sessionCount ?? null, data.depositToman ?? null, data.artistMessage,
      paymentIban, paymentCardNumber, proposedStart, proposedEnd],
  );
  if (!updated[0]) throw new Error("درخواست پیدا نشد.");
  const titles = { approved: "درخواست تاتو تأیید شد", needs_info: "اطلاعات بیشتری لازم است", rejected: "نتیجه بررسی درخواست", booked: "رزرو تاتو قطعی شد" };
  await notify(sql, updated[0].customer_id, titles[data.status], data.artistMessage, `tattoo_request_${data.status}`);
  return { ok: true as const };
}

async function performAcceptTattooProposal(userId: string, raw: unknown) {
  const data = z.object({ requestId: z.string() }).parse(raw);
  const sql = await getSql();
  const rows = await sql.query<{
    id: string; customer_id: string; business_id: string; customer_name: string; customer_phone: string;
    idea: string; style: string; proposed_slot_start: string; proposed_slot_end: string; payment_status: string;
  }>(`select id, customer_id, business_id, customer_name, customer_phone, idea, style,
             proposed_slot_start, proposed_slot_end, payment_status
        from tattoo_requests where id=$1`, [data.requestId]);
  const r = rows[0];
  if (!r || r.customer_id !== userId) throw new Error("دسترسی ندارید.");
  if (r.payment_status !== "proposal_pending" || !r.proposed_slot_start || !r.proposed_slot_end) throw new Error("این پیشنهاد قابل تأیید نیست.");
  if (new Date(r.proposed_slot_start).getTime() < Date.now() + 10 * 60000) throw new Error("زمان پیشنهادی گذشته است. از آرتیست زمان تازه بخواهید.");
  const overlap = await sql.query<{ id: string }>(
    `select id from bookings where business_id=$1 and status in ('requested','confirmed') and slot_start < $3 and slot_end > $2 limit 1`,
    [r.business_id, r.proposed_slot_start, r.proposed_slot_end],
  );
  if (overlap[0]) throw new Error("این زمان دیگر آزاد نیست. از آرتیست زمان تازه بخواهید.");
  const bookingId = crypto.randomUUID();
  try {
    await sql.query(
      `insert into bookings (id, business_id, customer_id, customer_name, customer_phone, slot_start, slot_end, kind, source, event_type, note, status, service_title, party_size)
       values ($1,$2,$3,$4,$5,$6,$7,'booking','online','booking',$8,'requested',$9,1)`,
      [bookingId, r.business_id, userId, r.customer_name, normalizeIranPhone(r.customer_phone), r.proposed_slot_start, r.proposed_slot_end, r.idea, r.style],
    );
  } catch (err) {
    if (isOccupancyConflict(err)) throw new Error("این زمان همین الان رزرو شد. از آرتیست زمان تازه بخواهید.");
    throw err;
  }
  await sql.query(
    `update tattoo_requests set booking_id=$2, payment_status='awaiting_payment', payment_hold_until=now()+interval '6 hours', updated_at=now()
      where id=$1 and customer_id=$3 and payment_status='proposal_pending'`,
    [r.id, bookingId, userId],
  );
  await notify(sql, userId, "مهلت پرداخت آغاز شد", "زمان پیشنهادی تأیید شد. برای ارسال رسید بیعانه ۶ ساعت فرصت دارید.", "tattoo_proposal_accepted", { bookingId, businessId: r.business_id });
  const owners = await sql.query<{ owner_id: string }>("select owner_id from businesses where id=$1", [r.business_id]);
  if (owners[0]) await notify(sql, owners[0].owner_id, "زمان پیشنهادی پذیرفته شد", "مشتری زمان تاتو را پذیرفت؛ مهلت پرداخت ۶ ساعته آغاز شد.", "tattoo_proposal_accepted", { bookingId, businessId: r.business_id });
  return { ok: true as const, bookingId };
}

const receiptImageSchema = z.string().max(1_400_000).refine((v) => /^data:image\/(jpeg|png|webp);base64,/i.test(v), "فرمت رسید معتبر نیست.");

async function performSubmitTattooReceipt(userId: string, raw: unknown) {
  const data = z.object({ requestId: z.string(), receiptImage: receiptImageSchema }).parse(raw);
  const sql = await getSql();
  const rows = await sql.query<{ id: string; customer_id: string; business_id: string | null; payment_status: string; payment_hold_until: string | null }>(`select id, customer_id, business_id, payment_status, payment_hold_until from tattoo_requests where id=$1`, [data.requestId]);
  const r = rows[0];
  if (!r || r.customer_id !== userId) throw new Error("دسترسی ندارید.");
  if (r.payment_status !== "awaiting_payment") throw new Error("این درخواست در وضعیت پرداخت نیست.");
  if (!r.payment_hold_until || new Date(r.payment_hold_until).getTime() <= Date.now()) {
    await sql.query(`update tattoo_requests set status='rejected', payment_status='expired', updated_at=now() where id=$1`, [r.id]);
    throw new Error("مهلت پرداخت تمام شده است.");
  }
  await sql.query(`update tattoo_requests set payment_status='receipt_submitted', payment_submitted_at=now(), payment_review_deadline=now()+interval '12 hours', receipt_image=$2, updated_at=now() where id=$1`, [r.id, data.receiptImage]);
  const admins = await sql.query<{ user_id: string }>("select user_id from profiles where is_admin=true");
  for (const a of admins) await notify(sql, a.user_id, "رسید پرداخت جدید", "رسید بیعانه برای بررسی ارسال شد.", "tattoo_receipt_submitted", { businessId: r.business_id ?? undefined });
  await notify(sql, userId, "رسید در دست بررسی", "رسید شما دریافت شد و حداکثر تا ۱۲ ساعت آینده بررسی می‌شود.", "tattoo_receipt_review", { businessId: r.business_id ?? undefined });
  return { ok: true as const };
}

async function performDecideTattooReceipt(userId: string, raw: unknown) {
  await requireAdmin(userId);
  const data = z.object({ requestId: z.string(), approved: z.boolean(), message: z.string().trim().min(2).max(1000) }).parse(raw);
  const sql = await getSql();
  const rows = await sql.query<{ customer_id: string; booking_id: string | null; business_id: string | null; payment_status: string }>(`select customer_id, booking_id, business_id, payment_status from tattoo_requests where id=$1`, [data.requestId]);
  const r = rows[0];
  if (!r || r.payment_status !== "receipt_submitted") throw new Error("رسید قابل بررسی نیست.");
  if (data.approved) {
    if (!r.booking_id) throw new Error("ابتدا زمان رزرو باید انتخاب شود.");
    await sql.query(`update tattoo_requests set status='booked', payment_status='approved', artist_message=$2, updated_at=now() where id=$1`, [data.requestId, data.message]);
    await sql.query(`update bookings set status='confirmed', finance_status='deposit_paid' where id=$1`, [r.booking_id]);
  } else {
    await sql.query(
      `update tattoo_requests set payment_status='awaiting_payment', payment_hold_until=now()+interval '6 hours',
         receipt_image=null, payment_submitted_at=null, payment_review_deadline=null, artist_message=$2, updated_at=now()
       where id=$1`,
      [data.requestId, data.message],
    );
  }
  await notify(sql, r.customer_id, data.approved ? "رزرو تاتو قطعی شد" : "رسید نیاز به اصلاح دارد", data.message, data.approved ? "tattoo_receipt_approved" : "tattoo_receipt_rejected", { bookingId: r.booking_id ?? undefined, businessId: r.business_id ?? undefined });
  return { ok: true as const };
}

export async function performEnsureProfile(userId: string, displayName = "کاربر"): Promise<Profile> {
  const sql = await getSql();
  let email: string | null = null;
  try {
    const users = await sql.query<{ email: string }>(`select email from "user" where id = $1`, [userId]);
    email = users[0]?.email ?? null;
  } catch {
    email = null;
  }
  const grant = shouldGrantBootstrapAdmin(email, env);
  await sql.query(
    `insert into profiles (user_id, display_name, is_admin)
     values ($1, $2, $3)
     on conflict (user_id) do nothing`,
    [userId, displayName.trim() || "کاربر", grant],
  );
  if (grant) {
    await sql.query(`update profiles set is_admin = true where user_id = $1`, [userId]);
    await sql.query(
      `update businesses set subscription_ends_at = '2099-12-31 23:59:59+00', updated_at = now()
       where owner_id = $1 and (subscription_ends_at is null or subscription_ends_at < '2099-12-31 23:59:59+00')`,
      [userId],
    );
  }
  const rows = await sql.query<{
    user_id: string;
    display_name: string;
    phone: string | null;
    is_admin: boolean;
  }>("select user_id, display_name, phone, is_admin from profiles where user_id = $1", [userId]);
  const row = rows[0];
  return {
    userId: row.user_id,
    displayName: row.display_name,
    phone: row.phone,
    isAdmin: Boolean(row.is_admin),
  };
}

async function performUpdateProfile(userId: string, raw: unknown) {
  const data = z
    .object({
      displayName: z.string().trim().min(2, "نام را کامل بنویسید.").max(80),
      phone: z.string().max(40).optional(),
    })
    .parse(raw);
  const phone = data.phone?.trim() ? normalizeIranPhone(data.phone) : "";
  if (phone && !isIranMobile(phone)) {
    throw new Error("شماره موبایل ایرانی معتبر وارد کنید. مثل 09126812852");
  }
  const sql = await getSql();
  await sql.query(
    `insert into profiles (user_id, display_name, phone, is_admin)
     values ($1, $2, $3, false)
     on conflict (user_id) do update set display_name = excluded.display_name, phone = excluded.phone`,
    [userId, data.displayName.trim(), phone || null],
  );
  return performEnsureProfile(userId, data.displayName);
}

async function performUpsertReview(userId: string, raw: unknown) {
  const data = z
    .object({
      businessId: z.string(),
      rating: z.number().int().min(1).max(5),
      body: z.string().max(600).optional(),
      authorName: z.string().min(2).max(80),
    })
    .parse(raw);
  const sql = await getSql();
  const visible = await sql.query(`select id from businesses b where b.id = $1 and ${VISIBLE_SQL}`, [data.businessId]);
  if (!visible[0]) throw new Error("برای این کسب‌وکار نمی‌توان نظر ثبت کرد.");
  await sql.query(
    `insert into reviews (id, business_id, user_id, author_name, rating, body)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (business_id, user_id) do update
       set rating = excluded.rating, body = excluded.body, author_name = excluded.author_name`,
    [crypto.randomUUID(), data.businessId, userId, data.authorName.trim(), data.rating, data.body?.trim() || null],
  );
  const rows = await sql.query<ReviewRow>(
    `select id, business_id, user_id, author_name, rating, body, owner_reply, owner_reply_at, created_at
     from reviews where business_id = $1 order by created_at desc`,
    [data.businessId],
  );
  return { ok: true as const, reviews: rows.map(mapReview) };
}

async function performReply(userId: string, raw: unknown) {
  const data = z
    .object({
      reviewId: z.string(),
      reply: z.string().min(2).max(400),
    })
    .parse(raw);
  const sql = await getSql();
  const rows = await sql.query<{ id: string }>(
    `update reviews r
     set owner_reply = $3, owner_reply_at = now()
     from businesses b
     where r.id = $1 and r.business_id = b.id and b.owner_id = $2
     returning r.id`,
    [data.reviewId, userId, data.reply.trim()],
  );
  if (!rows[0]) throw new Error("فقط صاحب کسب‌وکار می‌تواند پاسخ بدهد.");
  return { ok: true as const };
}

function parseJsonField<T>(value: T | string | null | undefined, fallback: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return (value ?? fallback) as T;
}

type Sql = Awaited<ReturnType<typeof getSql>>;

async function notify(
  sql: Sql,
  userId: string | null | undefined,
  title: string,
  body: string,
  kind: string,
  extra: { bookingId?: string; businessId?: string } = {},
) {
  if (!userId) return;
  await sql.query(
    `insert into notifications (id, user_id, title, body, kind, booking_id, business_id)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [crypto.randomUUID(), userId, title, body, kind, extra.bookingId ?? null, extra.businessId ?? null],
  );
}

async function audit(
  sql: Sql,
  bookingId: string,
  actorId: string | null,
  action: string,
  oldValue: unknown,
  newValue: unknown,
) {
  await sql.query(
    `insert into booking_events (id, booking_id, actor_id, action, old_value, new_value)
     values ($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
    [crypto.randomUUID(), bookingId, actorId, action, JSON.stringify(oldValue ?? null), JSON.stringify(newValue ?? null)],
  );
}

async function loadOccupancy(sql: Sql, businessId: string, untilIso: string): Promise<OccupancyHit[]> {
  const occ = await sql.query<{ slot_start: string; slot_end: string; resource_id: string | null }>(
    `select slot_start, slot_end, resource_id from (
       select (slot_start - make_interval(mins => coalesce(buffer_before, 0))) as slot_start,
              (slot_end + make_interval(mins => coalesce(buffer_after, 0))) as slot_end,
              coalesce(nullif(resource_id, ''), nullif(staff_id, '')) as resource_id
         from bookings
        where business_id = $1 and ${ACTIVE_OCCUPANCY_SQL} and slot_end > now() and slot_start < $2::timestamptz
       union all
       select slot_start, slot_end, coalesce(nullif(resource_id, ''), nullif(staff_id, ''))
         from booking_holds
        where business_id = $1 and expires_at > now()
     ) x`,
    [businessId, untilIso],
  );
  return occ.map((r) => ({ start: r.slot_start, end: r.slot_end, resourceId: r.resource_id }));
}

export async function loadResources(sql: Sql, businessId: string): Promise<BusinessResource[]> {
  const rows = await sql.query<{
    id: string;
    business_id: string;
    kind: string;
    name: string;
    color: string | null;
    active: boolean;
    sort_order: number;
    capacity: number | null;
  }>(
    `select r.id, r.business_id, r.kind, r.name, r.color, r.active, r.sort_order, r.capacity
       from business_resources r
      where r.business_id = $1
      order by r.sort_order, r.created_at`,
    [businessId],
  );
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const weekly = await sql.query<{ resource_id: string; day: string; open: string; close: string; closed: boolean }>(
    `select resource_id, day, open, close, closed from resource_work_hours
      where business_id = $1 and resource_id = any($2::text[])
      order by day`,
    [businessId, ids],
  );
  const special = await sql.query<{ resource_id: string; day: string; closed: boolean; shifts: unknown }>(
    `select resource_id, to_char(day, 'YYYY-MM-DD') as day, closed, shifts
       from resource_special_hours
      where business_id = $1 and resource_id = any($2::text[])`,
    [businessId, ids],
  );
  const hoursBy = new Map<string, WorkHour[]>();
  for (const row of weekly) {
    const list = hoursBy.get(row.resource_id) ?? [];
    list.push({ day: row.day, open: row.open, close: row.close, closed: Boolean(row.closed) });
    hoursBy.set(row.resource_id, list);
  }
  const specialBy = new Map<string, { dayKey: string; closed: boolean; shifts: { open: string; close: string }[] }[]>();
  for (const row of special) {
    const list = specialBy.get(row.resource_id) ?? [];
    list.push({
      dayKey: row.day,
      closed: Boolean(row.closed),
      shifts: Array.isArray(row.shifts) ? (row.shifts as { open: string; close: string }[]) : [],
    });
    specialBy.set(row.resource_id, list);
  }
  return rows.map((r) => ({
    id: r.id,
    businessId: r.business_id,
    kind: (RESOURCE_KINDS as readonly string[]).includes(r.kind) ? (r.kind as BusinessResource["kind"]) : "staff",
    name: r.name,
    color: r.color,
    active: Boolean(r.active),
    sortOrder: Number(r.sort_order) || 0,
    capacity: 1,
    workHours: hoursBy.get(r.id) ?? null,
    specialHours: specialBy.get(r.id) ?? null,
  }));
}

async function loadSpecialDays(sql: Sql, businessId: string) {
  const rows = await sql.query<{ day: string; closed: boolean; shifts: unknown }>(
    `select to_char(day, 'YYYY-MM-DD') as day, closed, shifts
     from business_special_hours
     where business_id = $1 and day >= (timezone('Asia/Tehran', now()))::date
     order by day asc`,
    [businessId],
  );
  return rows.map((r) => ({
    dayKey: r.day,
    closed: Boolean(r.closed),
    shifts: Array.isArray(r.shifts) ? (r.shifts as { open: string; close: string }[]) : [],
  }));
}

async function notifyWaitlist(sql: Sql, businessId: string, dayKey: string, businessName: string) {
  const rows = await sql.query<{ id: string; user_id: string }>(
    `select id, user_id from waitlist
     where business_id = $1 and day = $2::date and status = 'open'
     order by created_at asc
     limit 20`,
    [businessId, dayKey],
  );
  for (const row of rows) {
    await notify(
      sql,
      row.user_id,
      "وقت آزاد شد",
      `یک نوبت در «${businessName}» برای ${dayKey} آزاد شد. اگر هنوز می‌خواهید، زود رزرو کنید.`,
      "waitlist_open",
      { businessId },
    );
    await sql.query(`update waitlist set status = 'notified' where id = $1`, [row.id]);
  }
}

export async function performCreateBooking(userId: string, raw: unknown) {
  const data = z
    .object({
      businessId: z.string(),
      slotStart: z.string(),
      customerName: z.string().min(2).max(80),
      customerPhone: z.string().min(8).max(40),
      note: z.string().max(300).optional(),
      serviceTitle: z.string().max(80).optional(),
      partySize: z.number().int().min(1).max(20).optional(),
      resourceId: z.string().max(80).optional().nullable(),
      tattooRequestId: z.string().optional().nullable(),
    })
    .parse(raw);
  if (!isIranMobile(data.customerPhone)) throw new Error("شماره موبایل معتبر وارد کنید.");
  const start = new Date(data.slotStart);
  if (Number.isNaN(start.getTime()) || start.getTime() < Date.now() + 10 * 60000) {
    throw new Error("این ساعت قابل رزرو نیست.");
  }
  const sql = await getSql();
  const visible = await sql.query<{
    id: string;
    work_hours: unknown;
    slot_minutes: number;
    prices: unknown;
    name: string;
    owner_id: string;
  }>(
    `select id, work_hours, slot_minutes, prices, name, owner_id from businesses b where b.id = $1 and ${VISIBLE_SQL}`,
    [data.businessId],
  );
  if (!visible[0]) throw new Error("این کسب‌وکار الان نوبت نمی‌پذیرد.");
  const row = visible[0];
  const workHours = parseJsonField(row.work_hours as never, [] as WorkHour[]);
  const prices = parseJsonField(row.prices as never, [] as PriceItem[]);
  const slotMinutes = Number(row.slot_minutes) || 60;
  let duration = serviceDurationMinutes(prices, data.serviceTitle, slotMinutes);
  if (data.tattooRequestId) {
    const tattooRows = await sql.query<{ id: string; business_id: string | null; booking_id: string | null; customer_id: string; status: string; session_minutes: number | null; payment_status: string; payment_hold_until: string | null }>(
      `select id, business_id, booking_id, customer_id, status, session_minutes, payment_status, payment_hold_until from tattoo_requests where id = $1`,
      [data.tattooRequestId],
    );
    const tattoo = tattooRows[0];
    if (!tattoo || tattoo.customer_id !== userId || tattoo.business_id !== data.businessId || tattoo.status !== "approved") {
      throw new Error("این درخواست تاتو برای رزرو آماده نیست.");
    }
    if (tattoo.booking_id) throw new Error("زمان این درخواست قبلاً توسط آرتیست ثبت شده است.");
    if (tattoo.payment_status !== "awaiting_payment" || !tattoo.payment_hold_until || new Date(tattoo.payment_hold_until).getTime() <= Date.now()) {
      throw new Error("مهلت پرداخت این درخواست تمام شده است. درخواست جدید ثبت کنید.");
    }
    if (tattoo.session_minutes != null) duration = { ...duration, minutes: Number(tattoo.session_minutes) };
  }
  const buffers = serviceBuffers(prices, data.serviceTitle);
  const slotEnd = new Date(start.getTime() + duration.minutes * 60000).toISOString();
  const specialDays = await loadSpecialDays(sql, data.businessId);
  const busyInitial = await loadOccupancy(sql, data.businessId, slotEnd);
  const resources = await loadResources(sql, data.businessId);
  const staffed = hasActiveResources(resources);
  const opts = { specialDays, bufferBefore: buffers.before, bufferAfter: buffers.after };
  const requested = data.resourceId?.trim() || "";
  const anyStaff = staffed && !requested;
  const eligible = staffed ? eligibleResources(resources) : [];
  if (staffed && requested && !eligible.some((r) => r.id === requested)) {
    throw new Error("این منبع در دسترس نیست.");
  }

  const id = crypto.randomUUID();
  const consumed = new Set<string>();
  let busy = busyInitial;
  let resourceId: string | null = null;
  const maxAttempts = anyStaff ? Math.max(eligible.length, 1) : 1;
  let inserted = false;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    resourceId = requested || null;
    if (staffed) {
      if (anyStaff) {
        resourceId = assignResourceAtIso(
          { workHours, slotMinutes },
          busy,
          eligible,
          data.slotStart,
          14,
          new Date(),
          duration.minutes,
          opts,
          consumed,
        );
      }
      resourceId = persistableResourceId(true, resourceId);
      if (!resourceId) throw new Error("این ساعت قابل رزرو نیست.");
    } else {
      resourceId = null;
    }
    const rowResource = resourceId ? resources.find((r) => r.id === resourceId) : null;
    const allowed = rowResource
      ? slotsForResource({ workHours, slotMinutes }, busy, rowResource, true, 14, new Date(), duration.minutes, opts)
      : buildSlots(
          { workHours, slotMinutes },
          filterOccupancy(busy, resourceId, staffed),
          14,
          new Date(),
          duration.minutes,
          opts,
        );
    if (!allowed.some((s) => Math.abs(new Date(s.iso).getTime() - start.getTime()) < 1000)) {
      if (anyStaff && resourceId) {
        consumed.add(resourceId);
        continue;
      }
      throw new Error("این ساعت قابل رزرو نیست.");
    }
    try {
      await sql.query(
        `insert into bookings (id, business_id, customer_id, customer_name, customer_phone, slot_start, slot_end, kind, source, event_type, note, status, service_title, party_size, buffer_before, buffer_after, resource_id, staff_id)
         values ($1,$2,$3,$4,$5,$6,$7,'booking','online','booking',$8,'requested',$9,$10,$11,$12,$13,$13)`,
        [
          id,
          data.businessId,
          userId,
          data.customerName.trim(),
          normalizeIranPhone(data.customerPhone),
          data.slotStart,
          slotEnd,
          data.note?.trim() || null,
          data.serviceTitle?.trim() || null,
          data.partySize ?? 1,
          buffers.before,
          buffers.after,
          resourceId,
        ],
      );
      inserted = true;
      break;
    } catch (err) {
      if (!isOccupancyConflict(err)) throw err;
      if (!anyStaff || !resourceId) {
        throw new Error("این زمان همین الان توسط شخص دیگری رزرو شد. زمان‌های آزاد به‌روزرسانی شدند.");
      }
      consumed.add(resourceId);
      busy = await loadOccupancy(sql, data.businessId, slotEnd);
    }
  }
  if (!inserted) {
    throw new Error("این زمان همین الان توسط شخص دیگری رزرو شد. زمان‌های آزاد به‌روزرسانی شدند.");
  }
  if (staffed && !resourceId) {
    throw new Error("این ساعت قابل رزرو نیست.");
  }
  if (data.tattooRequestId) {
    await sql.query(
      `update tattoo_requests set booking_id = $2, updated_at = now()
       where id = $1 and customer_id = $3 and status = 'approved'`,
      [data.tattooRequestId, id, userId],
    );
  }
  await audit(sql, id, userId, "created", null, { slotStart: data.slotStart, slotEnd, status: "requested", resourceId, tattooRequestId: data.tattooRequestId ?? null });
  await notify(sql, userId, "رزرو ثبت شد", `درخواست نوبت شما در «${row.name}» ثبت شد.`, "booking_created", {
    bookingId: id,
    businessId: data.businessId,
  });
  await notify(sql, row.owner_id, "رزرو جدید", `نوبت تازه‌ای برای «${row.name}» ثبت شد.`, "booking_new", {
    bookingId: id,
    businessId: data.businessId,
  });
  return { id, slotStart: data.slotStart, slotEnd, resourceId };
}

async function performBookingStatus(userId: string, raw: unknown) {
  const data = z
    .object({
      id: z.string(),
      status: z.enum(["requested", "confirmed", "cancelled", "done", "no_show"]),
    })
    .parse(raw);
  const sql = await getSql();
  const rows = await sql.query<{
    kind: string;
    owner_id: string;
    customer_id: string | null;
    status: string;
    business_id: string;
    business_name: string;
    slot_start: string;
  }>(
    `select k.kind, b.owner_id, k.customer_id, k.status, k.business_id, b.name as business_name, k.slot_start
     from bookings k
     join businesses b on b.id = k.business_id
     where k.id = $1`,
    [data.id],
  );
  const row = rows[0];
  if (!row) throw new Error("رزرو پیدا نشد.");
  const kind = row.kind === "block" ? "block" : "booking";
  const isOwner = row.owner_id === userId;
  const isCustomer = Boolean(row.customer_id && row.customer_id === userId);
  if (kind === "block") {
    if (!isOwner || data.status !== "cancelled") {
      throw new Error("بازهٔ بسته فقط توسط صاحب کسب‌وکار قابل برداشتن است.");
    }
  } else if (isOwner) {
    /* owner may set any booking status */
  } else if (isCustomer) {
    if (data.status !== "cancelled") throw new Error("فقط می‌توانید رزرو خود را لغو کنید.");
  } else {
    throw new Error("دسترسی ندارید.");
  }
  await sql.query(`update bookings set status = $2 where id = $1`, [data.id, data.status]);
  await audit(sql, data.id, userId, data.status, { status: row.status }, { status: data.status });
  const titles: Record<string, [string, string]> = {
    confirmed: ["رزرو تأیید شد", "نوبت شما تأیید شد."],
    cancelled: ["رزرو لغو شد", "نوبت لغو شد."],
    done: ["نوبت انجام شد", "نوبت شما انجام‌شده ثبت شد."],
    no_show: ["عدم مراجعه", "این نوبت به‌عنوان عدم مراجعه ثبت شد."],
  };
  const msg = titles[data.status];
  if (msg && kind === "booking") {
    await notify(sql, row.customer_id, msg[0], `${msg[1]} «${row.business_name}»`, `booking_${data.status}`, {
      bookingId: data.id,
      businessId: row.business_id,
    });
    if (!isOwner) {
      await notify(sql, row.owner_id, msg[0], `${msg[1]} «${row.business_name}»`, `booking_${data.status}`, {
        bookingId: data.id,
        businessId: row.business_id,
      });
    }
  }
  if (data.status === "cancelled") {
    await notifyWaitlist(sql, row.business_id, tehranDayKey(new Date(row.slot_start)), row.business_name);
  }
  return { ok: true as const };
}

async function performCreateBlock(userId: string, raw: unknown) {
  const data = z
    .object({
      businessId: z.string(),
      slotStart: z.string(),
      slotEnd: z.string(),
      note: z.string().max(300).optional(),
      eventType: z.enum(["block", "break", "personal", "holiday"]).optional(),
      resourceId: z.string().max(80).optional().nullable(),
    })
    .parse(raw);
  const start = new Date(data.slotStart);
  const end = new Date(data.slotEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() - start.getTime() < 10 * 60000) {
    throw new Error("بازهٔ بستن باید حداقل ۱۰ دقیقه باشد.");
  }
  if (end.getTime() - start.getTime() > 24 * 3600 * 1000) {
    throw new Error("هر بستن حداکثر یک شبانه‌روز است.");
  }
  const sql = await getSql();
  const owned = await sql.query<{ id: string }>(
    `select id from businesses where id = $1 and owner_id = $2`,
    [data.businessId, userId],
  );
  if (!owned[0]) throw new Error("فقط صاحب کسب‌وکار می‌تواند بازه ببندد.");
  const eventType = data.eventType ?? "block";
  const resources = await loadResources(sql, data.businessId);
  const staffed = hasActiveResources(resources);
  let resourceId = data.resourceId?.trim() || null;
  if (resourceId && staffed && !resources.some((r) => r.id === resourceId && r.active !== false)) {
    throw new Error("این منبع در دسترس نیست.");
  }
  if (!staffed) resourceId = null;
  const id = crypto.randomUUID();
  try {
    await sql.query(
      `insert into bookings (id, business_id, customer_id, customer_name, customer_phone, slot_start, slot_end, kind, source, event_type, note, status, service_title, party_size, resource_id, staff_id)
       values ($1,$2,null,null,null,$3,$4,'block','manual',$5,$6,'confirmed',null,1,$7,$7)`,
      [id, data.businessId, data.slotStart, data.slotEnd, eventType, data.note?.trim() || null, resourceId],
    );
  } catch (err) {
    if (isOccupancyConflict(err)) throw new Error("این بازه با نوبت یا بستن دیگری تداخل دارد.");
    throw err;
  }
  await audit(sql, id, userId, "created", null, { eventType, slotStart: data.slotStart, slotEnd: data.slotEnd, resourceId });
  return { id, slotStart: data.slotStart, slotEnd: data.slotEnd, kind: "block" as const, eventType, resourceId };
}

async function performManualAppointment(userId: string, raw: unknown) {
  const data = z
    .object({
      businessId: z.string(),
      slotStart: z.string(),
      slotEnd: z.string().optional(),
      customerName: z.string().min(2).max(80),
      customerPhone: z.string().max(40).optional(),
      serviceTitle: z.string().max(80).optional(),
      note: z.string().max(300).optional(),
      durationMinutes: z.number().int().min(10).max(4320).optional(),
      resourceId: z.string().max(80).optional().nullable(),
    })
    .parse(raw);
  const sql = await getSql();
  const owned = await sql.query<{ id: string; slot_minutes: number; prices: unknown; work_hours: unknown; name: string }>(
    `select id, slot_minutes, prices, work_hours, name from businesses where id = $1 and owner_id = $2`,
    [data.businessId, userId],
  );
  if (!owned[0]) throw new Error("فقط صاحب کسب‌وکار می‌تواند نوبت دستی ثبت کند.");
  const start = new Date(data.slotStart);
  if (Number.isNaN(start.getTime())) throw new Error("ساعت نامعتبر است.");
  const prices = parseJsonField(owned[0].prices as never, [] as PriceItem[]);
  const duration = data.durationMinutes
    ?? serviceDurationMinutes(prices, data.serviceTitle, Number(owned[0].slot_minutes) || 60).minutes;
  const slotEnd = data.slotEnd ?? new Date(start.getTime() + duration * 60000).toISOString();
  if (new Date(slotEnd).getTime() <= start.getTime()) throw new Error("پایان نوبت باید بعد از شروع باشد.");
  const id = crypto.randomUUID();
  const resources = await loadResources(sql, data.businessId);
  const staffed = hasActiveResources(resources);
  let resourceId = data.resourceId?.trim() || null;
  if (staffed) {
    if (!resourceId) throw new Error("منبع را انتخاب کنید.");
    if (!resources.some((r) => r.id === resourceId && r.active !== false)) {
      throw new Error("این منبع در دسترس نیست.");
    }
  } else {
    resourceId = null;
  }
  try {
    await sql.query(
      `insert into bookings (id, business_id, customer_id, customer_name, customer_phone, slot_start, slot_end, kind, source, event_type, note, status, service_title, party_size, resource_id, staff_id)
       values ($1,$2,null,$3,$4,$5,$6,'booking','manual','manual',$7,'confirmed',$8,1,$9,$9)`,
      [
        id,
        data.businessId,
        data.customerName.trim(),
        data.customerPhone ? normalizeIranPhone(data.customerPhone) : null,
        data.slotStart,
        slotEnd,
        data.note?.trim() || null,
        data.serviceTitle?.trim() || null,
        resourceId,
      ],
    );
  } catch (err) {
    if (isOccupancyConflict(err)) throw new Error("این بازه با نوبت یا بستن دیگری تداخل دارد.");
    throw err;
  }
  await audit(sql, id, userId, "created", null, { source: "manual", slotStart: data.slotStart, slotEnd, resourceId });
  return { id, slotStart: data.slotStart, slotEnd, source: "manual" as const, resourceId };
}

async function performReschedule(userId: string, raw: unknown) {
  const data = z.object({ id: z.string(), slotStart: z.string(), slotEnd: z.string().optional(), resourceId: z.string().max(80).optional().nullable() }).parse(raw);
  const sql = await getSql();
  const rows = await sql.query<{
    id: string;
    owner_id: string;
    customer_id: string | null;
    business_id: string;
    slot_start: string;
    slot_end: string | null;
    service_title: string | null;
    kind: string;
    buffer_before: number;
    buffer_after: number;
    work_hours: unknown;
    slot_minutes: number;
    prices: unknown;
    name: string;
    resource_id: string | null;
  }>(
    `select k.id, b.owner_id, k.customer_id, k.business_id, k.slot_start, k.slot_end, k.service_title, k.kind,
            coalesce(k.buffer_before,0) as buffer_before, coalesce(k.buffer_after,0) as buffer_after,
            b.work_hours, b.slot_minutes, b.prices, b.name, k.resource_id
     from bookings k join businesses b on b.id = k.business_id
     where k.id = $1`,
    [data.id],
  );
  const row = rows[0];
  if (!row) throw new Error("رزرو پیدا نشد.");
  if (row.kind === "block") throw new Error("بازهٔ بسته را به‌جای جابجایی بردارید و دوباره ببندید.");
  const isOwner = row.owner_id === userId;
  const isCustomer = row.customer_id === userId;
  if (!isOwner && !isCustomer) throw new Error("دسترسی ندارید.");
  const start = new Date(data.slotStart);
  if (Number.isNaN(start.getTime()) || start.getTime() < Date.now() + 10 * 60000) {
    throw new Error("این ساعت قابل رزرو نیست.");
  }
  const prices = parseJsonField(row.prices as never, [] as PriceItem[]);
  const workHours = parseJsonField(row.work_hours as never, [] as WorkHour[]);
  const duration = serviceDurationMinutes(prices, row.service_title, Number(row.slot_minutes) || 60);
  const slotEnd = data.slotEnd ?? new Date(start.getTime() + duration.minutes * 60000).toISOString();
  const specialDays = await loadSpecialDays(sql, row.business_id);
  const resources = await loadResources(sql, row.business_id);
  const staffed = hasActiveResources(resources);
  const resourceId = resolveRescheduleResource(data.resourceId, row.resource_id);
  if (staffed && resourceId && !resources.some((r) => r.id === resourceId)) {
    throw new Error("این منبع در دسترس نیست.");
  }
  const busy = (await loadOccupancy(sql, row.business_id, slotEnd)).filter(
    (b) => Math.abs(new Date(b.start).getTime() - new Date(row.slot_start).getTime()) > 1000,
  );
  const resRow = resourceId ? resources.find((r) => r.id === resourceId) : null;
  const allowed = resRow
    ? slotsForResource(
        { workHours, slotMinutes: Number(row.slot_minutes) || 60 },
        busy,
        resRow,
        staffed,
        DEFAULT_BOOKING_HORIZON_DAYS,
        new Date(),
        duration.minutes,
        { specialDays, bufferBefore: Number(row.buffer_before) || 0, bufferAfter: Number(row.buffer_after) || 0 },
      )
    : buildSlots(
        { workHours, slotMinutes: Number(row.slot_minutes) || 60 },
        filterOccupancy(busy, resourceId, staffed),
        DEFAULT_BOOKING_HORIZON_DAYS,
        new Date(),
        duration.minutes,
        { specialDays, bufferBefore: Number(row.buffer_before) || 0, bufferAfter: Number(row.buffer_after) || 0 },
      );
  if (!allowed.some((s) => Math.abs(new Date(s.iso).getTime() - start.getTime()) < 1000)) {
    throw new Error("این ساعت قابل رزرو نیست.");
  }
  try {
    await sql.query(`update bookings set slot_start = $2, slot_end = $3, resource_id = $4, staff_id = $4 where id = $1`, [
      data.id,
      data.slotStart,
      slotEnd,
      resourceId,
    ]);
  } catch (err) {
    if (isOccupancyConflict(err)) {
      throw new Error("این زمان همین الان توسط شخص دیگری رزرو شد. زمان‌های آزاد به‌روزرسانی شدند.");
    }
    throw err;
  }
  await audit(sql, data.id, userId, "rescheduled", { slotStart: row.slot_start, slotEnd: row.slot_end }, { slotStart: data.slotStart, slotEnd });
  await notify(sql, row.customer_id, "زمان رزرو تغییر کرد", `نوبت «${row.name}» جابه‌جا شد.`, "booking_rescheduled", {
    bookingId: data.id,
    businessId: row.business_id,
  });
  if (!isOwner) {
    await notify(sql, row.owner_id, "درخواست تغییر زمان", `یک نوبت در «${row.name}» جابه‌جا شد.`, "booking_rescheduled", {
      bookingId: data.id,
      businessId: row.business_id,
    });
  }
  return { ok: true as const, slotStart: data.slotStart, slotEnd };
}

async function performWaitlistJoin(userId: string, raw: unknown) {
  const data = z
    .object({
      businessId: z.string(),
      day: z.string(),
      serviceTitle: z.string().max(80).optional(),
      timeFrom: z.string().optional(),
      timeTo: z.string().optional(),
    })
    .parse(raw);
  const sql = await getSql();
  const vis = await sql.query(`select id from businesses b where b.id = $1 and ${VISIBLE_SQL}`, [data.businessId]);
  if (!vis[0]) throw new Error("این کسب‌وکار در دسترس نیست.");
  const id = crypto.randomUUID();
  await sql.query(
    `insert into waitlist (id, business_id, user_id, service_title, day, time_from, time_to, status)
     values ($1,$2,$3,$4,$5::date,$6,$7,'open')`,
    [id, data.businessId, userId, data.serviceTitle ?? null, data.day, data.timeFrom ?? null, data.timeTo ?? null],
  );
  return { id };
}

async function performNotifications(userId: string) {
  const sql = await getSql();
  const rows = await sql.query<{
    id: string;
    title: string;
    body: string;
    kind: string;
    booking_id: string | null;
    business_id: string | null;
    read_at: string | null;
    created_at: string;
  }>(
    `select id, title, body, kind, booking_id, business_id, read_at, created_at
     from notifications where user_id = $1 order by created_at desc limit 80`,
    [userId],
  );
  return {
    unread: rows.filter((r) => !r.read_at).length,
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      kind: r.kind,
      bookingId: r.booking_id,
      businessId: r.business_id,
      readAt: r.read_at,
      createdAt: r.created_at,
    })),
  };
}

async function performMarkNotificationsRead(userId: string, raw: unknown) {
  const data = z.object({ ids: z.array(z.string()).optional() }).parse(raw ?? {});
  const sql = await getSql();
  if (data.ids?.length) {
    await sql.query(
      `update notifications set read_at = now() where user_id = $1 and id = any($2::text[]) and read_at is null`,
      [userId, data.ids],
    );
  } else {
    await sql.query(`update notifications set read_at = now() where user_id = $1 and read_at is null`, [userId]);
  }
  return { ok: true as const };
}

async function performSpecialHours(userId: string, raw: unknown) {
  const data = z
    .object({
      businessId: z.string(),
      day: z.string(),
      closed: z.boolean(),
      shifts: z.array(z.object({ open: z.string(), close: z.string() })).optional(),
      note: z.string().max(200).optional(),
    })
    .parse(raw);
  const sql = await getSql();
  const owned = await sql.query(`select id from businesses where id = $1 and owner_id = $2`, [data.businessId, userId]);
  if (!owned[0]) throw new Error("دسترسی ندارید.");
  const id = crypto.randomUUID();
  await sql.query(
    `insert into business_special_hours (id, business_id, day, closed, shifts, note)
     values ($1,$2,$3::date,$4,$5::jsonb,$6)
     on conflict (business_id, day) do update set closed = excluded.closed, shifts = excluded.shifts, note = excluded.note`,
    [id, data.businessId, data.day, data.closed, JSON.stringify(data.shifts ?? []), data.note ?? null],
  );
  return { ok: true as const };
}

async function performTodaySummary(userId: string) {
  const sql = await getSql();
  const rows = await sql.query<{
    total: string;
    next_start: string | null;
    cancelled: string;
  }>(
    `select
       count(*) filter (where k.kind = 'booking' and k.status in ('requested','confirmed'))::text as total,
       min(k.slot_start) filter (where k.kind = 'booking' and k.status in ('requested','confirmed') and k.slot_start > now()) as next_start,
       count(*) filter (where k.kind = 'booking' and k.status = 'cancelled' and k.slot_start >= date_trunc('day', timezone('Asia/Tehran', now()) at time zone 'Asia/Tehran'))::text as cancelled
     from bookings k
     join businesses b on b.id = k.business_id
     where b.owner_id = $1
       and k.slot_start >= date_trunc('day', timezone('Asia/Tehran', now()) at time zone 'Asia/Tehran')
       and k.slot_start < date_trunc('day', timezone('Asia/Tehran', now()) at time zone 'Asia/Tehran') + interval '1 day'`,
    [userId],
  );
  return {
    todayCount: Number(rows[0]?.total) || 0,
    nextStart: rows[0]?.next_start ?? null,
    cancelledToday: Number(rows[0]?.cancelled) || 0,
  };
}

async function performCreateBusiness(userId: string, raw: unknown) {
  const data = businessInput.parse(raw);
  const sql = await getSql();
  const id = crypto.randomUUID();
  const hours: WorkHour[] = data.workHours?.length ? data.workHours : DEFAULT_HOURS;
  const prices: PriceItem[] = data.prices?.length ? data.prices : [];
  const level = deriveVerificationLevel(data);
  const evidence = level === "basic" ? { source: "listing_fields", phase: 2 } : {};
  await sql.query(
    `insert into businesses (
      id, owner_id, name, job_title, phone, province, city, address,
      latitude, longitude, category_id, description, instagram, whatsapp, website,
      work_hours, slot_minutes, prices, offer_text, approval_status, is_active,
      verification_level, verification_evidence, ranking_fresh_at
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18::jsonb,$19,'pending', true,
      $20, $21::jsonb, now()
    )`,
    [
      id,
      userId,
      data.name.trim(),
      data.jobTitle?.trim() || null,
      data.phone?.trim() || null,
      data.province,
      data.city,
      data.address?.trim() || null,
      data.latitude,
      data.longitude,
      data.categoryId,
      data.description?.trim() || null,
      data.instagram?.trim() || null,
      data.whatsapp?.trim() || null,
      toWebsiteHref(data.website),
      JSON.stringify(hours),
      data.slotMinutes ?? 60,
      JSON.stringify(prices),
      data.offerText?.trim() || null,
      level,
      JSON.stringify(evidence),
    ],
  );
  return { id };
}

async function performUpdateBusiness(userId: string, raw: unknown) {
  const data = businessInput.extend({ id: z.string() }).parse(raw);
  const sql = await getSql();
  const hours: WorkHour[] = data.workHours?.length ? data.workHours : DEFAULT_HOURS;
  const prices: PriceItem[] = data.prices?.length ? data.prices : [];
  const prev = await sql.query<{
    verification_level: string | null;
    category_id: number;
    prices: PriceItem[] | string;
  }>(`select verification_level, category_id, prices from businesses where id = $1 and owner_id = $2`, [
    data.id,
    userId,
  ]);
  if (!prev[0]) return { ok: true as const };
  const prevPrices = typeof prev[0].prices === "string" ? JSON.parse(prev[0].prices) : prev[0].prices;
  const bump = shouldBumpRankingFresh(
    { categoryId: Number(prev[0].category_id), priceCount: Array.isArray(prevPrices) ? prevPrices.length : 0 },
    { categoryId: data.categoryId, priceCount: prices.length },
  );
  const derived = deriveVerificationLevel(data);
  const level = nextVerificationLevel(
    (prev[0].verification_level as VerificationLevel) || "unverified",
    derived,
  );
  const evidence = level === "basic" ? { source: "listing_fields", phase: 2 } : {};
  await sql.query(
    `update businesses set
      name = $3, job_title = $4, phone = $5, province = $6, city = $7, address = $8,
      latitude = $9, longitude = $10, category_id = $11, description = $12,
      instagram = $13, whatsapp = $14, website = $15, work_hours = $16::jsonb,
      slot_minutes = $17, prices = $18::jsonb, offer_text = $19, updated_at = now(),
      verification_level = $20,
      verification_evidence = case when $20 = verification_level then verification_evidence else $21::jsonb end,
      ranking_fresh_at = case when $22 then now() else coalesce(ranking_fresh_at, created_at) end
     where id = $1 and owner_id = $2`,
    [
      data.id,
      userId,
      data.name.trim(),
      data.jobTitle?.trim() || null,
      data.phone?.trim() || null,
      data.province,
      data.city,
      data.address?.trim() || null,
      data.latitude,
      data.longitude,
      data.categoryId,
      data.description?.trim() || null,
      data.instagram?.trim() || null,
      data.whatsapp?.trim() || null,
      toWebsiteHref(data.website),
      JSON.stringify(hours),
      data.slotMinutes ?? 60,
      JSON.stringify(prices),
      data.offerText?.trim() || null,
      level,
      JSON.stringify(evidence),
      bump,
    ],
  );
  return { ok: true as const };
}

async function performSetActive(userId: string, raw: unknown) {
  const data = z.object({ id: z.string(), isActive: z.boolean() }).parse(raw);
  const sql = await getSql();
  await sql.query(`update businesses set is_active = $3, updated_at = now() where id = $1 and owner_id = $2`, [
    data.id,
    userId,
    data.isActive,
  ]);
  return { ok: true as const };
}

async function performDemoPlan(_userId: string, _raw: unknown) {
  throw new Error("فعال‌سازی اشتراک فقط از مسیر پرداخت انجام می‌شود.");
}

async function performAdminDecide(userId: string, raw: unknown) {
  const data = z.object({ id: z.string(), decision: z.enum(["approved", "rejected"]) }).parse(raw);
  await requireAdmin(userId);
  const sql = await getSql();
  if (data.decision === "approved") {
    await sql.query(
      `update businesses
       set approval_status = 'approved',
           is_active = true,
           trial_started_at = coalesce(trial_started_at, now()),
           trial_ends_at = coalesce(trial_ends_at, now() + interval '7 days'),
           updated_at = now()
       where id = $1`,
      [data.id],
    );
  } else {
    await sql.query(`update businesses set approval_status = 'rejected', updated_at = now() where id = $1`, [data.id]);
  }
  return { ok: true as const };
}

async function performMine(userId: string) {
  const sql = await getSql();
  const rows = await sql.query<BizRow>(
    `select ${BIZ_SELECT}
     from businesses b
     join categories c on c.id = b.category_id
     where b.owner_id = $1
     order by b.created_at desc`,
    [userId],
  );
  return rows.map(mapBusiness);
}

async function performOwnerBookings(userId: string) {
  const sql = await getSql();
  const rows = await sql.query<BookingRow>(
    `select ${BOOKING_SELECT}
     from bookings k
     join businesses b on b.id = k.business_id
     left join business_resources r on r.id = k.resource_id
     left join tattoo_requests tr on tr.booking_id = k.id
     where b.owner_id = $1
     order by k.slot_start desc`,
    [userId],
  );
  return rows.map(mapBooking);
}

async function performOwnerStats(userId: string): Promise<OwnerStats> {
  const sql = await getSql();
  const rows = await sql.query<{
    requested: number | string;
    confirmed: number | string;
    done: number | string;
    cancelled: number | string;
    reviews: number | string;
    rating_avg: number | string | null;
  }>(
    `select
       (select count(*) from bookings k join businesses b on b.id = k.business_id where b.owner_id = $1 and k.kind = 'booking' and k.status = 'requested') as requested,
       (select count(*) from bookings k join businesses b on b.id = k.business_id where b.owner_id = $1 and k.kind = 'booking' and k.status = 'confirmed') as confirmed,
       (select count(*) from bookings k join businesses b on b.id = k.business_id where b.owner_id = $1 and k.kind = 'booking' and k.status = 'done') as done,
       (select count(*) from bookings k join businesses b on b.id = k.business_id where b.owner_id = $1 and k.kind = 'booking' and k.status = 'cancelled') as cancelled,
       (select count(*) from reviews r join businesses b2 on b2.id = r.business_id where b2.owner_id = $1) as reviews,
       (select avg(r.rating) from reviews r join businesses b2 on b2.id = r.business_id where b2.owner_id = $1) as rating_avg`,
    [userId],
  );
  const row = rows[0];
  return {
    requested: Number(row?.requested) || 0,
    confirmed: Number(row?.confirmed) || 0,
    done: Number(row?.done) || 0,
    cancelled: Number(row?.cancelled) || 0,
    reviews: Number(row?.reviews) || 0,
    ratingAvg: Number(row?.rating_avg) || 0,
  };
}

async function performMyBookings(userId: string) {
  const sql = await getSql();
  const rows = await sql.query<BookingRow>(
    `select ${BOOKING_SELECT}
     from bookings k
     join businesses b on b.id = k.business_id
     left join business_resources r on r.id = k.resource_id
     left join tattoo_requests tr on tr.booking_id = k.id
     where k.customer_id = $1 and k.kind = 'booking'
     order by k.slot_start desc`,
    [userId],
  );
  return rows.map(mapBooking);
}

async function performAdminList(userId: string) {
  await requireAdmin(userId);
  const sql = await getSql();
  const rows = await sql.query<BizRow>(
    `select ${BIZ_SELECT}
     from businesses b
     join categories c on c.id = b.category_id
     order by
       case when b.approval_status = 'pending' then 0 else 1 end,
       b.created_at desc`,
  );
  return rows.map(mapBusiness);
}

async function performCategories() {
  const sql = await getSql();
  const rows = await sql.query<{
    id: number;
    name: string;
    slug: string;
    icon: string;
    sort_order: number;
  }>("select id, name, slug, icon, sort_order from categories order by sort_order, id");
  return rows.map(mapCategory);
}

async function performBusiness(raw: unknown, viewerId?: string) {
  const data = z.object({ id: z.string() }).parse(raw);
  const sql = await getSql();
  const rows = await sql.query<BizRow>(
    `select ${BIZ_SELECT}
     from businesses b
     join categories c on c.id = b.category_id
     where b.id = $1
       and (${VISIBLE_SQL} or b.owner_id = $2)
     limit 1`,
    [data.id, viewerId || ""],
  );
  return rows[0] ? mapBusiness(rows[0]) : null;
}

async function performReviews(raw: unknown) {
  const data = z.object({ businessId: z.string() }).parse(raw);
  const sql = await getSql();
  const rows = await sql.query<ReviewRow>(
    `select id, business_id, user_id, author_name, rating, body, owner_reply, owner_reply_at, created_at
     from reviews where business_id = $1 order by created_at desc`,
    [data.businessId],
  );
  return rows.map(mapReview);
}

async function performBusy(raw: unknown) {
  const data = z.object({ businessId: z.string() }).parse(raw);
  const sql = await getSql();
  const rows = await sql.query<{ slot_start: string; slot_end: string; resource_id: string | null }>(
    `select slot_start, slot_end, resource_id from (
       select (slot_start - make_interval(mins => coalesce(buffer_before, 0))) as slot_start,
              (slot_end + make_interval(mins => coalesce(buffer_after, 0))) as slot_end,
              coalesce(nullif(resource_id, ''), nullif(staff_id, '')) as resource_id
         from bookings
        where business_id = $1 and ${ACTIVE_OCCUPANCY_SQL} and slot_end > now()
       union all
       select slot_start, slot_end, coalesce(nullif(resource_id, ''), nullif(staff_id, ''))
         from booking_holds
        where business_id = $1 and expires_at > now()
     ) x`,
    [data.businessId],
  );
  return rows.map((r) => ({ start: r.slot_start, end: r.slot_end, resourceId: r.resource_id }));
}

async function performListResources(raw: unknown) {
  const data = z.object({ businessId: z.string() }).parse(raw);
  const sql = await getSql();
  return loadResources(sql, data.businessId);
}

async function performUpsertResource(userId: string, raw: unknown) {
  const data = z
    .object({
      businessId: z.string(),
      id: z.string().optional(),
      name: z.string().trim().min(1).max(80),
      kind: z.enum(["staff", "chair", "room", "equipment"]).optional(),
      color: z.string().max(20).optional().nullable(),
      active: z.boolean().optional(),
    })
    .parse(raw);
  const sql = await getSql();
  const owned = await sql.query(`select id from businesses where id = $1 and owner_id = $2`, [data.businessId, userId]);
  if (!owned[0]) throw new Error("دسترسی ندارید.");
  const id = data.id || crypto.randomUUID();
  const kind = data.kind ?? "staff";
  if (!(RESOURCE_KINDS as readonly string[]).includes(kind)) {
    throw new Error("نوع منبع نامعتبر است.");
  }
  await sql.query(
    `insert into business_resources (id, business_id, kind, name, color, active, capacity)
     values ($1,$2,$3,$4,$5,coalesce($6, true), 1)
     on conflict (id) do update set name = excluded.name, kind = excluded.kind, color = excluded.color,
       active = coalesce($6, business_resources.active), capacity = 1
     where business_resources.business_id = $2`,
    [id, data.businessId, kind, data.name.trim(), data.color ?? null, data.active ?? null],
  );
  return { id, resources: await loadResources(sql, data.businessId) };
}


async function performFavorites(userId: string) {
  const sql = await getSql();
  const rows = await sql.query<{ business_id: string }>(
    "select business_id from favorites where user_id = $1 order by created_at desc",
    [userId],
  );
  return rows.map((r) => r.business_id);
}

async function performFavoriteToggle(userId: string, raw: unknown) {
  const data = z.object({ id: z.string().min(1).max(80) }).parse(raw);
  const sql = await getSql();
  const existing = await sql.query<{ business_id: string }>(
    "select business_id from favorites where user_id = $1 and business_id = $2",
    [userId, data.id],
  );
  if (existing[0]) {
    await sql.query("delete from favorites where user_id = $1 and business_id = $2", [userId, data.id]);
  } else {
    await sql.query(
      "insert into favorites (user_id, business_id) values ($1,$2) on conflict do nothing",
      [userId, data.id],
    );
  }
  return performFavorites(userId);
}

export async function dispatchSave(userId: string, type: string, payload: unknown, displayName?: string) {
  switch (type) {
    case "profile":
      return performEnsureProfile(userId, displayName);
    case "updateProfile":
      return performUpdateProfile(userId, payload);
    case "review":
      return performUpsertReview(userId, payload);
    case "reply":
      return performReply(userId, payload);
    case "booking":
      return performCreateBooking(userId, payload);
    case "createTattooRequest":
      return performCreateTattooRequest(userId, payload);
    case "myTattooRequests":
      return performMyTattooRequests(userId);
    case "studioTattooRequests":
      return performStudioTattooRequests(userId);
    case "decideTattooRequest":
      return performDecideTattooRequest(userId, payload);
    case "acceptTattooProposal":
      return performAcceptTattooProposal(userId, payload);
    case "mehrLoanLeads":
      return performMehrLoanLeads(userId);
    case "mehrLoanAccess":
      return { allowed: await hasMehrLoanAccess(userId) };
    case "updateMehrLoanLead":
      return performUpdateMehrLoanLead(userId, payload);
    case "submitTattooReceipt":
      return performSubmitTattooReceipt(userId, payload);
    case "decideTattooReceipt":
      return performDecideTattooReceipt(userId, payload);
    case "blockInterval":
      return performCreateBlock(userId, payload);
    case "bookingStatus":
      return performBookingStatus(userId, payload);
    case "manualAppointment":
      return performManualAppointment(userId, payload);
    case "reschedule":
      return performReschedule(userId, payload);
    case "waitlistJoin":
      return performWaitlistJoin(userId, payload);
    case "notifications":
      return performNotifications(userId);
    case "notificationsRead":
      return performMarkNotificationsRead(userId, payload);
    case "specialHours":
      return performSpecialHours(userId, payload);
    case "todaySummary":
      return performTodaySummary(userId);
    case "createBusiness":
      return performCreateBusiness(userId, payload);
    case "updateBusiness":
      return performUpdateBusiness(userId, payload);
    case "setActive":
      return performSetActive(userId, payload);
    case "demoPlan":
      return performDemoPlan(userId, payload);
    case "adminDecide":
      return performAdminDecide(userId, payload);
    case "mine":
      return performMine(userId);
    case "ownerBookings":
      return performOwnerBookings(userId);
    case "ownerStats":
      return performOwnerStats(userId);
    case "myBookings":
      return performMyBookings(userId);
    case "adminList":
      return performAdminList(userId);
    case "categories":
      return performCategories();
    case "business":
      return performBusiness(payload, userId);
    case "reviews":
      return performReviews(payload);
    case "busySlots":
      return performBusy(payload);
    case "listResources":
      return performListResources(payload);
    case "upsertResource":
      return performUpsertResource(userId, payload);
    case "favorites":
      return performFavorites(userId);
    case "favoriteToggle":
      return performFavoriteToggle(userId, payload);
    case "financeMine": {
      const { performBusinessFinance } = await import("@/lib/finance/server");
      return performBusinessFinance(userId, false);
    }
    case "financeAdmin": {
      const { performAdminFinance } = await import("@/lib/finance/server");
      return performAdminFinance(userId);
    }
    case "myPayments": {
      const { performMyPayments } = await import("@/lib/finance/server");
      return performMyPayments(userId);
    }
    case "saveIban": {
      const { performSaveIban } = await import("@/lib/finance/server");
      return performSaveIban(userId, payload as { businessId: string; iban: string; ownerName: string; cardNumber?: string });
    }
    case "requestSettlement": {
      const { performRequestSettlement } = await import("@/lib/finance/server");
      return performRequestSettlement(userId, payload as { businessId: string; amountIrr: number });
    }
    case "createCheckout": {
      const { performCreateCheckout } = await import("@/lib/finance/server");
      return performCreateCheckout(userId, payload as { bookingId: string; clientAmountIrr?: number });
    }
    case "financeCsv": {
      const { performFinanceCsv } = await import("@/lib/finance/server");
      const p = (payload ?? {}) as { businessId?: string };
      const admin = await performEnsureProfile(userId);
      return performFinanceCsv(userId, Boolean(admin.isAdmin), p.businessId);
    }
    case "providerStatus": {
      const { financeProviderStatus } = await import("@/lib/finance/server");
      return financeProviderStatus();
    }
    default:
      throw new Error("درخواست نامعتبر است.");
  }
}
