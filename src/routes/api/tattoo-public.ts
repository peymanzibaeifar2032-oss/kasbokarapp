import { createFileRoute } from "@tanstack/react-router";
import { z, ZodError } from "zod";
import { getSql } from "@/lib/db";
import { isIranMobile, normalizeInstagramHandle, normalizeIranPhone } from "@/lib/format";
import { allowRate, clientKey } from "@/lib/server/rate-limit";
import { acceptGuestByPhone, submitGuestReceiptByPhone } from "@/lib/server/tattoo-guest-pay";
import { makeTattooTrackingCode, normalizeTattooTrackingCode } from "@/lib/tattoo-flow";
import { finalizeNewTattooRequest, refreshTattooEstimates } from "@/lib/server/tattoo-estimate";

const imageDataSchema = z.string().max(1_000_000).refine(
  (value) => /^data:image\/(jpeg|png|webp);base64,/i.test(value),
  "فرمت تصویر معتبر نیست.",
);

const requestSchema = z.object({
  customerName: z.string().trim().min(2, "نام را کامل بنویسید.").max(80),
  customerPhone: z.string().trim().max(40),
  customerPhone2: z.string().trim().max(40).optional(),
  customerInstagram: z.string().trim().max(80).optional(),
  requestType: z.enum(["new", "coverup", "consultation", "custom", "repair", "continuation"]),
  style: z.string().trim().min(2, "سبک را انتخاب کنید.").max(240),
  idea: z.string().trim().min(10, "ایده را کمی کامل‌تر توضیح دهید.").max(1500),
  placement: z.string().trim().min(2, "محل اجرا را بنویسید.").max(120),
  sizeCm: z.string().trim().min(1, "اندازه را بنویسید.").max(80),
  preferredDates: z.string().trim().max(200).optional(),
  colorMode: z.string().trim().max(40).optional(),
  bodySide: z.string().trim().max(20).optional(),
  sizeMode: z.string().trim().max(20).optional(),
  styles: z.array(z.string().trim().max(40)).max(8).optional(),
  referenceImages: z.array(imageDataSchema).max(3).default([]),
  bodyImages: z.array(imageDataSchema).max(2).default([]),
  images: z.array(z.object({ kind: z.string().max(20), data: imageDataSchema })).max(8).optional(),
});

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function sameOrigin(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}

type StatusRow = {
  id: string;
  tracking_code?: string | null;
  customer_name: string;
  style: string;
  placement: string;
  status: string;
  artist_message: string | null;
  payment_status: string | null;
  payment_hold_until?: string | null;
  payment_review_deadline?: string | null;
  price_min_toman?: number | null;
  session_minutes?: number | null;
  session_count?: number | null;
  deposit_toman?: number | null;
  payment_iban?: string | null;
  payment_card_number?: string | null;
  proposed_slot_start: string | null;
  proposed_slot_end?: string | null;
  estimate_min_toman?: number | null;
  estimate_max_toman?: number | null;
  created_at: string;
};

function mapStatus(row: StatusRow) {
  return {
    id: row.id,
    trackingCode: row.tracking_code || "",
    customerName: row.customer_name,
    style: row.style,
    placement: row.placement,
    status: row.status,
    artistMessage: row.artist_message,
    paymentStatus: row.payment_status,
    paymentHoldUntil: row.payment_hold_until || null,
    paymentReviewDeadline: row.payment_review_deadline || null,
    priceMinToman: row.price_min_toman == null ? null : Number(row.price_min_toman),
    sessionMinutes: row.session_minutes == null ? null : Number(row.session_minutes),
    sessionCount: row.session_count == null ? null : Number(row.session_count),
    depositToman: row.deposit_toman == null ? null : Number(row.deposit_toman),
    paymentIban: row.payment_iban || null,
    paymentCardNumber: row.payment_card_number || null,
    proposedSlotStart: row.proposed_slot_start,
    proposedSlotEnd: row.proposed_slot_end || null,
    createdAt: row.created_at,
  };
}

const statusSelect = `select id, tracking_code, customer_name, style, placement, status, artist_message, payment_status,
         payment_hold_until, payment_review_deadline, price_min_toman, session_minutes, session_count,
         deposit_toman, payment_iban, payment_card_number, proposed_slot_start, proposed_slot_end,
         estimate_min_toman, estimate_max_toman, created_at
       from tattoo_requests`;

const statusSelectLegacy = `select id, customer_name, style, placement, status, artist_message, payment_status,
         payment_hold_until, payment_review_deadline, price_min_toman, session_minutes, session_count,
         deposit_toman, payment_iban, payment_card_number, proposed_slot_start, proposed_slot_end, created_at
       from tattoo_requests`;

async function markRepliesSeen(sql: Awaited<ReturnType<typeof getSql>>, ids: string[]) {
  if (!ids.length) return;
  await sql.query(
    `update tattoo_requests set message_seen_at = now()
      where id = any($1::text[]) and message_seen_at is null
        and artist_message is not null and btrim(artist_message) <> ''`,
    [ids],
  );
}

async function queryStatus(sql: Awaited<ReturnType<typeof getSql>>, where: string, params: unknown[]) {
  try {
    return await sql.query<StatusRow>(`${statusSelect} ${where}`, params);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/tracking_code/i.test(message)) throw error;
    return sql.query<StatusRow>(`${statusSelectLegacy} ${where}`, params);
  }
}

async function createGuest(request: Request) {
  if (!allowRate(`tattoo-guest:${clientKey(request)}`, 8, 60 * 60 * 1000)) {
    return json({ error: "چند درخواست پشت‌سرهم آمد. کمی بعد دوباره بفرست." }, 429);
  }
  const body = await request.json().catch(() => null);
  const data = requestSchema.parse(body);
  const phone = normalizeIranPhone(data.customerPhone);
  if (!isIranMobile(phone)) return json({ error: "شماره موبایل ایرانی معتبر وارد کنید." }, 400);
  let phone2: string | null = null;
  if (data.customerPhone2?.trim()) {
    phone2 = normalizeIranPhone(data.customerPhone2);
    if (!isIranMobile(phone2)) return json({ error: "شماره موبایل دوم معتبر نیست." }, 400);
  }
  const instagram = normalizeInstagramHandle(data.customerInstagram);
  const pictures = data.images || [];
  if ((data.requestType === "coverup" || data.requestType === "repair") && !pictures.some((image) => image.kind === "current") && !data.bodyImages.length) {
    return json({ error: "برای کاور یا ترمیم، عکس تاتوی فعلی را اضافه کنید." }, 400);
  }
  const bytes = [...data.referenceImages, ...data.bodyImages, ...pictures.map((image) => image.data)].reduce((sum, value) => sum + value.length, 0);
  if (bytes > 3_500_000) return json({ error: "حجم عکس‌ها زیاد است. عکس کم‌حجم‌تر بفرست." }, 400);
  const sql = await getSql();
  const recent = await sql.query<{ id: string; tracking_code: string }>(
    `select id, tracking_code from tattoo_requests
      where customer_phone = $1 and idea = $2 and created_at > now() - interval '15 minutes'
      order by created_at desc limit 1`,
    [phone, data.idea],
  );
  if (recent[0]) return json({ id: recent[0].id, trackingCode: recent[0].tracking_code, duplicate: true });
  const id = crypto.randomUUID();
  let trackingCode = "";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    trackingCode = makeTattooTrackingCode();
    try {
      await sql.query(
        `insert into tattoo_requests
          (id, tracking_code, customer_id, customer_name, customer_phone, customer_phone_2, customer_instagram, request_type, style, idea, placement,
           size_cm, preferred_dates, reference_images, body_images)
         values ($1,$2,null,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb)`,
        [
          id,
          trackingCode,
          data.customerName,
          phone,
          phone2,
          instagram || null,
          data.requestType,
          data.style,
          data.idea,
          data.placement,
          data.sizeCm,
          data.preferredDates || null,
          JSON.stringify(data.referenceImages),
          JSON.stringify(data.bodyImages),
        ],
      );
      break;
    } catch (error) {
      if (attempt === 5 || !/unique|duplicate/i.test(error instanceof Error ? error.message : "")) throw error;
    }
  }
  const admins = await sql.query<{ user_id: string }>("select user_id from profiles where is_admin = true");
  for (const admin of admins) {
    await sql.query(
      `insert into notifications (id, user_id, title, body, kind) values ($1,$2,$3,$4,'tattoo_request_new')`,
      [crypto.randomUUID(), admin.user_id, "درخواست جدید تاتو", `درخواست تازه از ${data.customerName} · کد ${trackingCode}`],
    );
  }
  const priced = await finalizeNewTattooRequest(sql, id, {
    requestType: data.requestType,
    placement: data.placement,
    style: data.style,
    sizeCm: data.sizeCm,
    colorMode: data.colorMode || "",
    idea: data.idea,
    imageCount: pictures.length + data.referenceImages.length + data.bodyImages.length,
    bodySide: data.bodySide,
    sizeMode: data.sizeMode,
    styles: data.styles,
    images: pictures.length
      ? pictures
      : [
          ...data.referenceImages.map((item) => ({ kind: "reference", data: item })),
          ...data.bodyImages.map((item) => ({ kind: "placement", data: item })),
        ],
  });
  return json({ id, trackingCode });
}

async function lookup(request: Request) {
  if (!allowRate(`tattoo-status:${clientKey(request)}`, 30, 60 * 60 * 1000)) {
    return json({ error: "چند بار پشت‌سرهم زدی. کمی بعد دوباره امتحان کن." }, 429);
  }
  const body = (await request.json().catch(() => null)) as { phone?: unknown; code?: unknown } | null;
  const code = normalizeTattooTrackingCode(typeof body?.code === "string" ? body.code : "");
  const phone = normalizeIranPhone(typeof body?.phone === "string" ? body.phone : "");
  const sql = await getSql();
  if (code.length === 6) {
    const rows = await queryStatus(sql, "where tracking_code = $1 limit 1", [code]);
    await refreshTattooEstimates(sql, rows.map((row) => row.id));
    const fresh = await queryStatus(sql, "where tracking_code = $1 limit 1", [code]);
    await markRepliesSeen(sql, fresh.map((row) => row.id));
    return json({ items: fresh.map(mapStatus) });
  }
  if (isIranMobile(phone)) {
    const rows = await queryStatus(
      sql,
      "where customer_phone = $1 or customer_phone_2 = $1 order by created_at desc limit 20",
      [phone],
    );
    await refreshTattooEstimates(sql, rows.map((row) => row.id));
    const fresh = await queryStatus(
      sql,
      "where customer_phone = $1 or customer_phone_2 = $1 order by created_at desc limit 20",
      [phone],
    );
    await markRepliesSeen(sql, fresh.map((row) => row.id));
    return json({ items: fresh.map(mapStatus) });
  }
  return json({ error: "کد پیگیری ۶ رقمی یا شماره موبایل را بنویس." }, 400);
}

async function handle(request: Request) {
  try {
    if (!sameOrigin(request)) return json({ error: "این درخواست مجاز نیست." }, 403);
    const url = new URL(request.url);
    const op = url.searchParams.get("op");
    if (op === "status") return await lookup(request);
    if (op === "accept") return await acceptGuestByPhone(request);
    if (op === "receipt") return await submitGuestReceiptByPhone(request);
    return await createGuest(request);
  } catch (err) {
    if (err instanceof ZodError) return json({ error: err.issues[0]?.message || "اطلاعات را کامل کنید." }, 400);
    const message = err instanceof Error ? err.message : "ثبت انجام نشد.";
    return json({ error: message }, 400);
  }
}

export const Route = createFileRoute("/api/tattoo-public")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
