import { z } from "zod";
import { DEFAULT_HOURS } from "@/lib/data/catalog";
import { getSql } from "@/lib/db";
import { env } from "@/lib/env.server";
import { isIranMobile, normalizeIranPhone, parseToman, toWebsiteHref } from "@/lib/format";
import { shouldGrantBootstrapAdmin, isOccupancyConflict } from "@/lib/server/admin-bootstrap";
import { buildSlots, serviceDurationMinutes, type BusyInterval } from "@/lib/hours";
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
import type { OwnerStats, PriceItem, Profile, WorkHour } from "@/lib/types";

const hoursSchema = z.array(
  z.object({
    day: z.string(),
    open: z.string(),
    close: z.string(),
    closed: z.boolean().optional(),
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
    })
    .parse(raw);
  if (!isIranMobile(data.customerPhone)) throw new Error("شماره موبایل معتبر وارد کنید.");
  const start = new Date(data.slotStart);
  if (Number.isNaN(start.getTime()) || start.getTime() < Date.now() + 10 * 60000) {
    throw new Error("این ساعت قابل رزرو نیست.");
  }
  const sql = await getSql();
  const visible = await sql.query<{ id: string; work_hours: unknown; slot_minutes: number; prices: unknown }>(
    `select id, work_hours, slot_minutes, prices from businesses b where b.id = $1 and ${VISIBLE_SQL}`,
    [data.businessId],
  );
  if (!visible[0]) throw new Error("این کسب‌وکار الان نوبت نمی‌پذیرد.");
  const row = visible[0];
  const workHours = parseJsonField(row.work_hours as never, [] as WorkHour[]);
  const prices = parseJsonField(row.prices as never, [] as PriceItem[]);
  const slotMinutes = Number(row.slot_minutes) || 60;
  const duration = serviceDurationMinutes(prices, data.serviceTitle, slotMinutes);
  const slotEnd = new Date(start.getTime() + duration.minutes * 60000).toISOString();
  const occ = await sql.query<{ slot_start: string; slot_end: string }>(
    `select slot_start, slot_end from bookings
     where business_id = $1 and ${ACTIVE_OCCUPANCY_SQL}
       and slot_end > now() and slot_start < $2::timestamptz`,
    [data.businessId, slotEnd],
  );
  const busy: BusyInterval[] = occ.map((r) => ({ start: r.slot_start, end: r.slot_end }));
  const allowed = buildSlots({ workHours, slotMinutes }, busy, 7, new Date(), duration.minutes);
  if (!allowed.some((s) => Math.abs(new Date(s.iso).getTime() - start.getTime()) < 1000)) {
    throw new Error("این ساعت قابل رزرو نیست.");
  }
  const id = crypto.randomUUID();
  try {
    await sql.query(
      `insert into bookings (id, business_id, customer_id, customer_name, customer_phone, slot_start, slot_end, kind, note, status, service_title, party_size)
       values ($1,$2,$3,$4,$5,$6,$7,'booking',$8,'requested',$9,$10)`,
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
      ],
    );
  } catch (err) {
    if (isOccupancyConflict(err)) throw new Error("این نوبت تازه گرفته شد. ساعت دیگری انتخاب کنید.");
    throw err;
  }
  return { id, slotStart: data.slotStart, slotEnd };
}

async function performBookingStatus(userId: string, raw: unknown) {
  const data = z
    .object({
      id: z.string(),
      status: z.enum(["requested", "confirmed", "cancelled", "done"]),
    })
    .parse(raw);
  const sql = await getSql();
  const rows = await sql.query<{ kind: string; owner_id: string; customer_id: string | null }>(
    `select k.kind, b.owner_id, k.customer_id
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
  return { ok: true as const };
}

async function performCreateBlock(userId: string, raw: unknown) {
  const data = z
    .object({
      businessId: z.string(),
      slotStart: z.string(),
      slotEnd: z.string(),
      note: z.string().max(300).optional(),
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
  const id = crypto.randomUUID();
  try {
    await sql.query(
      `insert into bookings (id, business_id, customer_id, customer_name, customer_phone, slot_start, slot_end, kind, note, status, service_title, party_size)
       values ($1,$2,null,null,null,$3,$4,'block',$5,'confirmed',null,1)`,
      [id, data.businessId, data.slotStart, data.slotEnd, data.note?.trim() || null],
    );
  } catch (err) {
    if (isOccupancyConflict(err)) throw new Error("این بازه با نوبت یا بستن دیگری تداخل دارد.");
    throw err;
  }
  return { id, slotStart: data.slotStart, slotEnd: data.slotEnd, kind: "block" as const };
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
  const rows = await sql.query<{ slot_start: string; slot_end: string }>(
    `select slot_start, slot_end from bookings
     where business_id = $1 and ${ACTIVE_OCCUPANCY_SQL}
       and slot_end > now()`,
    [data.businessId],
  );
  return rows.map((r) => ({ start: r.slot_start, end: r.slot_end }));
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
    case "blockInterval":
      return performCreateBlock(userId, payload);
    case "bookingStatus":
      return performBookingStatus(userId, payload);
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
    case "favorites":
      return performFavorites(userId);
    case "favoriteToggle":
      return performFavoriteToggle(userId, payload);
    default:
      throw new Error("درخواست نامعتبر است.");
  }
}
