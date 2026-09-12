import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db";
import { DEFAULT_HOURS } from "@/lib/data/catalog";
import { isIranMobile, toWebsiteHref } from "@/lib/format";
import { isOpenNow } from "@/lib/hours";
import { logSearch } from "@/lib/search/log-search";
import { parseSearchQuery } from "@/lib/search/parse-query";
import { sortByRelevance } from "@/lib/search/ranking";
import {
  BOOKING_SELECT,
  BIZ_SELECT,
  BIZ_SELECT_JOINED,
  REVIEWS_AGG_JOIN,
  VISIBLE_SQL,
  mapBooking,
  mapBusiness,
  mapCategory,
  mapReview,
  type BookingRow,
  type BizRow,
  type ReviewRow,
} from "@/lib/server/db-map";
import type { CityRank, OwnerStats, PriceItem, Profile, WorkHour } from "@/lib/types";

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
    price: z.number(),
  }),
);

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql.query<{
    id: number;
    name: string;
    slug: string;
    icon: string;
    sort_order: number;
  }>("select id, name, slug, icon, sort_order from categories order by sort_order, id");
  return rows.map(mapCategory);
});

export const listBusinesses = createServerFn({ method: "GET" })
  .validator(
    z.object({
      q: z.string().optional(),
      categoryId: z.number().optional(),
      province: z.string().optional(),
      city: z.string().optional(),
      originLat: z.number().optional(),
      originLng: z.number().optional(),
      openNow: z.boolean().optional(),
      sort: z.enum(["relevance", "distance", "new"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const parsed = parseSearchQuery(data.q);
    const categoryId = data.categoryId ?? parsed.categoryId;
    const province = (data.province && data.province.length > 0 ? data.province : parsed.province) ?? null;
    const city = (data.city && data.city.length > 0 ? data.city : parsed.city) ?? null;
    const wantOpen = Boolean(data.openNow || parsed.openNow);
    const remainderRaw =
      parsed.mode === "fallback" ? parsed.normalized : parsed.remainder;
    const remainder = remainderRaw.replace(/[%_]/g, "").trim();
    const like = remainder ? `%${remainder}%` : null;
    const origin =
      Number.isFinite(data.originLat) && Number.isFinite(data.originLng)
        ? { lat: data.originLat as number, lng: data.originLng as number }
        : null;

    const rows = await sql.query<BizRow>(
      `select ${BIZ_SELECT_JOINED}
       from businesses b
       join categories c on c.id = b.category_id
       ${REVIEWS_AGG_JOIN}
       where ${VISIBLE_SQL}
         and ($1::text is null or b.category_id = $1::int)
         and ($2::text is null or $2 = '' or b.province = $2)
         and ($3::text is null or b.name ilike $3 or b.job_title ilike $3 or b.city ilike $3 or c.name ilike $3 or b.address ilike $3)
         and ($4::text is null or $4 = '' or b.city = $4)
       order by b.id asc`,
      [
        categoryId != null ? String(categoryId) : null,
        province,
        like,
        city,
      ],
    );

    let items = rows.map(mapBusiness).map((b) => ({
      ...b,
      openNow: isOpenNow(b.workHours),
    }));
    if (wantOpen) items = items.filter((b) => b.openNow);
    const sort = data.sort ?? "relevance";
    if (sort === "new") {
      items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt) || a.id.localeCompare(b.id));
    } else if (sort === "distance" && origin) {
      items.sort((a, b) => {
        const da = (a.latitude - origin.lat) ** 2 + (a.longitude - origin.lng) ** 2;
        const db = (b.latitude - origin.lat) ** 2 + (b.longitude - origin.lng) ** 2;
        return da - db || a.id.localeCompare(b.id);
      });
    } else {
      items = sortByRelevance(items, { origin });
    }

    logSearch({
      mode: data.q?.trim() ? parsed.mode : "classic",
      zero: items.length === 0,
      count: items.length,
      categoryId,
      city: Boolean(city),
      openNow: wantOpen,
      nearMe: parsed.nearMe && Boolean(origin),
      remainder: Boolean(remainder),
    });

    return items;
  });

export const getBusiness = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const viewer = await getSessionUser().catch(() => null);
    const rows = await sql.query<BizRow>(
      `select ${BIZ_SELECT}
       from businesses b
       join categories c on c.id = b.category_id
       left join profiles p on p.user_id = $2
       where b.id = $1
         and (${VISIBLE_SQL} or b.owner_id = $2 or p.is_admin = true)
       limit 1`,
      [data.id, viewer?.id || ""],
    );
    return rows[0] ? mapBusiness(rows[0]) : null;
  });

export const listReviews = createServerFn({ method: "GET" })
  .validator(z.object({ businessId: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql.query<ReviewRow>(
      `select id, business_id, user_id, author_name, rating, body, owner_reply, owner_reply_at, created_at
       from reviews where business_id = $1 order by created_at desc`,
      [data.businessId],
    );
    return rows.map(mapReview);
  });

export const listBusySlots = createServerFn({ method: "GET" })
  .validator(z.object({ businessId: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql.query<{ slot_start: string }>(
      `select slot_start from bookings
       where business_id = $1 and status in ('requested','confirmed') and slot_start > now()`,
      [data.businessId],
    );
    return rows.map((r) => r.slot_start);
  });

export const upsertReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      businessId: z.string(),
      rating: z.number().int().min(1).max(5),
      body: z.string().max(600).optional(),
      authorName: z.string().min(2).max(80),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const visible = await sql.query(`select id from businesses b where b.id = $1 and ${VISIBLE_SQL}`, [
      data.businessId,
    ]);
    if (!visible[0]) throw new Error("برای این کسب‌وکار نمی‌توان نظر ثبت کرد.");
    await sql.query(
      `insert into reviews (id, business_id, user_id, author_name, rating, body)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (business_id, user_id) do update
         set rating = excluded.rating, body = excluded.body, author_name = excluded.author_name`,
      [
        crypto.randomUUID(),
        data.businessId,
        context.userId,
        data.authorName.trim(),
        data.rating,
        data.body?.trim() || null,
      ],
    );
    return { ok: true };
  });

export const replyToReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      reviewId: z.string(),
      reply: z.string().min(2).max(400),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql.query<{ id: string }>(
      `update reviews r
       set owner_reply = $3, owner_reply_at = now()
       from businesses b
       where r.id = $1 and r.business_id = b.id and b.owner_id = $2
       returning r.id`,
      [data.reviewId, context.userId, data.reply.trim()],
    );
    if (!rows[0]) throw new Error("فقط صاحب کسب‌وکار می‌تواند پاسخ بدهد.");
    return { ok: true };
  });

export const listSimilar = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const mine = await sql.query<{ city: string; category_id: number }>(
      "select city, category_id from businesses where id = $1",
      [data.id],
    );
    if (!mine[0]) return [];
    const rows = await sql.query<BizRow>(
      `select ${BIZ_SELECT}
       from businesses b
       join categories c on c.id = b.category_id
       where ${VISIBLE_SQL}
         and b.id <> $1
         and b.category_id = $3
       order by
         case when b.city = $2 then 0 else 1 end,
         coalesce((select avg(r.rating) from reviews r where r.business_id = b.id), 0) desc
       limit 3`,
      [data.id, mine[0].city, mine[0].category_id],
    );
    return rows.map(mapBusiness);
  });

export const getCityRank = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const mine = await sql.query<{
      city: string;
      category_id: number;
      category_name: string;
      rating: number | string;
    }>(
      `select b.city, b.category_id, c.name as category_name,
              coalesce((select avg(r.rating) from reviews r where r.business_id = b.id), 0) as rating
       from businesses b
       join categories c on c.id = b.category_id
       where b.id = $1`,
      [data.id],
    );
    if (!mine[0]) return null;
    const peers = await sql.query<{ id: string; rating: number | string }>(
      `select b.id,
              coalesce((select avg(r.rating) from reviews r where r.business_id = b.id), 0) as rating
       from businesses b
       where ${VISIBLE_SQL}
         and b.city = $1 and b.category_id = $2`,
      [mine[0].city, mine[0].category_id],
    );
    const sorted = [...peers].sort((a, b) => Number(b.rating) - Number(a.rating) || a.id.localeCompare(b.id));
    const idx = sorted.findIndex((p) => p.id === data.id);
    const rank: CityRank = {
      rank: idx >= 0 ? idx + 1 : sorted.length + 1,
      total: Math.max(sorted.length, 1),
      city: mine[0].city,
      categoryName: mine[0].category_name,
    };
    return rank;
  });

export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql.query(
      `insert into profiles (user_id, display_name, is_admin)
       values ($1, $2, false)
       on conflict (user_id) do nothing`,
      [context.userId, "کاربر"],
    );
    const rows = await sql.query<{
      user_id: string;
      display_name: string;
      phone: string | null;
      is_admin: boolean;
    }>("select user_id, display_name, phone, is_admin from profiles where user_id = $1", [
      context.userId,
    ]);
    const row = rows[0];
    const profile: Profile = {
      userId: row.user_id,
      displayName: row.display_name,
      phone: row.phone,
      isAdmin: Boolean(row.is_admin),
    };
    return profile;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      displayName: z.string().min(2).max(80),
      phone: z.string().max(20).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql.query(
      `insert into profiles (user_id, display_name, phone, is_admin)
       values ($1, $2, $3, false)
       on conflict (user_id) do update set display_name = excluded.display_name, phone = excluded.phone`,
      [context.userId, data.displayName.trim(), data.phone?.trim() || null],
    );
    return { ok: true };
  });

const businessInput = z.object({
  name: z.string().min(2).max(80),
  jobTitle: z.string().max(80).optional(),
  phone: z.string().max(20).optional(),
  province: z.string().min(2),
  city: z.string().min(2),
  address: z.string().max(200).optional(),
  latitude: z.number(),
  longitude: z.number(),
  categoryId: z.number(),
  description: z.string().max(800).optional(),
  instagram: z.string().max(80).optional(),
  whatsapp: z.string().max(20).optional(),
  website: z.string().max(120).optional(),
  workHours: hoursSchema.optional(),
  slotMinutes: z.number().min(10).max(4320).optional(),
  prices: pricesSchema.optional(),
  offerText: z.string().max(80).optional(),
});

export const createBusiness = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(businessInput)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = crypto.randomUUID();
    const hours: WorkHour[] = data.workHours?.length ? data.workHours : DEFAULT_HOURS;
    const prices: PriceItem[] = data.prices?.length ? data.prices : [];
    await sql.query(
      `insert into businesses (
        id, owner_id, name, job_title, phone, province, city, address,
        latitude, longitude, category_id, description, instagram, whatsapp, website,
        work_hours, slot_minutes, prices, offer_text, approval_status, is_active
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18::jsonb,$19,'pending', true
      )`,
      [
        id,
        context.userId,
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
      ],
    );
    return { id };
  });

export const updateBusiness = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(businessInput.extend({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const hours: WorkHour[] = data.workHours?.length ? data.workHours : DEFAULT_HOURS;
    const prices: PriceItem[] = data.prices?.length ? data.prices : [];
    await sql.query(
      `update businesses set
        name = $3, job_title = $4, phone = $5, province = $6, city = $7, address = $8,
        latitude = $9, longitude = $10, category_id = $11, description = $12,
        instagram = $13, whatsapp = $14, website = $15, work_hours = $16::jsonb,
        slot_minutes = $17, prices = $18::jsonb, offer_text = $19, updated_at = now()
       where id = $1 and owner_id = $2`,
      [
        data.id,
        context.userId,
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
      ],
    );
    return { ok: true };
  });

export const setBusinessActive = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string(), isActive: z.boolean() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql.query(
      `update businesses set is_active = $3, updated_at = now() where id = $1 and owner_id = $2`,
      [data.id, context.userId, data.isActive],
    );
    return { ok: true };
  });

export const myBusinesses = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<BizRow>(
      `select ${BIZ_SELECT}
       from businesses b
       join categories c on c.id = b.category_id
       where b.owner_id = $1
       order by b.created_at desc`,
      [context.userId],
    );
    return rows.map(mapBusiness);
  });

export const ownerStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
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
         (select count(*) from bookings k join businesses b on b.id = k.business_id where b.owner_id = $1 and k.status = 'requested') as requested,
         (select count(*) from bookings k join businesses b on b.id = k.business_id where b.owner_id = $1 and k.status = 'confirmed') as confirmed,
         (select count(*) from bookings k join businesses b on b.id = k.business_id where b.owner_id = $1 and k.status = 'done') as done,
         (select count(*) from bookings k join businesses b on b.id = k.business_id where b.owner_id = $1 and k.status = 'cancelled') as cancelled,
         (select count(*) from reviews r join businesses b2 on b2.id = r.business_id where b2.owner_id = $1) as reviews,
         (select avg(r.rating) from reviews r join businesses b2 on b2.id = r.business_id where b2.owner_id = $1) as rating_avg`,
      [context.userId],
    );
    const row = rows[0];
    const stats: OwnerStats = {
      requested: Number(row?.requested) || 0,
      confirmed: Number(row?.confirmed) || 0,
      done: Number(row?.done) || 0,
      cancelled: Number(row?.cancelled) || 0,
      reviews: Number(row?.reviews) || 0,
      ratingAvg: Number(row?.rating_avg) || 0,
    };
    return stats;
  });

export const activateDemoPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql.query(
      `update businesses
       set subscription_ends_at = now() + interval '30 days',
           is_active = true,
           updated_at = now()
       where id = $1 and owner_id = $2 and approval_status = 'approved'`,
      [data.id, context.userId],
    );
    return { ok: true };
  });

export const createBooking = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      businessId: z.string(),
      slotStart: z.string(),
      customerName: z.string().min(2).max(80),
      customerPhone: z.string().min(8).max(20),
      note: z.string().max(300).optional(),
      serviceTitle: z.string().max(80).optional(),
      partySize: z.number().int().min(1).max(20).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    if (!isIranMobile(data.customerPhone)) throw new Error("شماره موبایل معتبر وارد کنید.");
    const start = new Date(data.slotStart);
    if (Number.isNaN(start.getTime()) || start.getTime() < Date.now() + 10 * 60000) {
      throw new Error("این ساعت قابل رزرو نیست.");
    }
    const sql = await getSql();
    const visible = await sql.query(
      `select id from businesses b where b.id = $1 and ${VISIBLE_SQL}`,
      [data.businessId],
    );
    if (!visible[0]) throw new Error("این کسب‌وکار الان نوبت نمی‌پذیرد.");
    const clash = await sql.query(
      `select id from bookings
       where business_id = $1 and slot_start = $2 and status in ('requested','confirmed')`,
      [data.businessId, data.slotStart],
    );
    if (clash[0]) throw new Error("این نوبت تازه گرفته شد. ساعت دیگری انتخاب کنید.");
    const id = crypto.randomUUID();
    await sql.query(
      `insert into bookings (id, business_id, customer_id, customer_name, customer_phone, slot_start, note, status, service_title, party_size)
       values ($1,$2,$3,$4,$5,$6,$7,'requested',$8,$9)`,
      [
        id,
        data.businessId,
        context.userId,
        data.customerName.trim(),
        data.customerPhone.trim(),
        data.slotStart,
        data.note?.trim() || null,
        data.serviceTitle?.trim() || null,
        data.partySize ?? 1,
      ],
    );
    return { id };
  });

export const myBookings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<BookingRow>(
      `select ${BOOKING_SELECT}
       from bookings k
       join businesses b on b.id = k.business_id
       where k.customer_id = $1
       order by k.slot_start desc`,
      [context.userId],
    );
    return rows.map(mapBooking);
  });

export const ownerBookings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<BookingRow>(
      `select ${BOOKING_SELECT}
       from bookings k
       join businesses b on b.id = k.business_id
       where b.owner_id = $1
       order by k.slot_start desc`,
      [context.userId],
    );
    return rows.map(mapBooking);
  });

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string(),
      status: z.enum(["requested", "confirmed", "cancelled", "done"]),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql.query(
      `update bookings k
       set status = $3
       from businesses b
       where k.id = $1 and k.business_id = b.id
         and (b.owner_id = $2 or k.customer_id = $2)
         and (
           b.owner_id = $2
           or ($3 = 'cancelled' and k.customer_id = $2)
         )`,
      [data.id, context.userId, data.status],
    );
    return { ok: true };
  });

export const adminList = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const me = await sql.query<{ is_admin: boolean }>(
      "select is_admin from profiles where user_id = $1",
      [context.userId],
    );
    if (!me[0]?.is_admin) throw new Error("دسترسی مدیریت ندارید.");
    const rows = await sql.query<BizRow>(
      `select ${BIZ_SELECT}
       from businesses b
       join categories c on c.id = b.category_id
       order by
         case when b.approval_status = 'pending' then 0 else 1 end,
         b.created_at desc`,
    );
    return rows.map(mapBusiness);
  });

export const adminDecide = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string(),
      decision: z.enum(["approved", "rejected"]),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await sql.query<{ is_admin: boolean }>(
      "select is_admin from profiles where user_id = $1",
      [context.userId],
    );
    if (!me[0]?.is_admin) throw new Error("دسترسی مدیریت ندارید.");
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
      await sql.query(
        `update businesses
         set approval_status = 'rejected', updated_at = now()
         where id = $1`,
        [data.id],
      );
    }
    return { ok: true };
  });
