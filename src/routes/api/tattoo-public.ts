import { createFileRoute } from "@tanstack/react-router";
import { z, ZodError } from "zod";
import { getSql } from "@/lib/db";
import { isIranMobile, normalizeInstagramHandle, normalizeIranPhone } from "@/lib/format";
import { allowRate, clientKey } from "@/lib/server/rate-limit";
import { makeTattooTrackingCode, normalizeTattooTrackingCode } from "@/lib/tattoo-flow";

const imageDataSchema = z.string().max(1_000_000).refine(
  (value) => /^data:image\/(jpeg|png|webp);base64,/i.test(value),
  "فرمت تصویر معتبر نیست.",
);

const requestSchema = z.object({
  customerName: z.string().trim().min(2, "نام را کامل بنویسید.").max(80),
  customerPhone: z.string().trim().max(40),
  customerPhone2: z.string().trim().max(40).optional(),
  customerInstagram: z.string().trim().max(80).optional(),
  requestType: z.enum(["new", "coverup", "consultation"]),
  style: z.string().trim().min(2, "سبک را انتخاب کنید.").max(80),
  idea: z.string().trim().min(10, "ایده را کمی کامل‌تر توضیح دهید.").max(1500),
  placement: z.string().trim().min(2, "محل اجرا را بنویسید.").max(120),
  sizeCm: z.string().trim().min(1, "اندازه تقریبی را بنویسید.").max(60),
  preferredDates: z.string().trim().max(200).optional(),
  referenceImages: z.array(imageDataSchema).max(3).default([]),
  bodyImages: z.array(imageDataSchema).max(2).default([]),
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
  tracking_code: string;
  customer_name: string;
  style: string;
  placement: string;
  status: string;
  artist_message: string | null;
  payment_status: string | null;
  proposed_slot_start: string | null;
  created_at: string;
};

function mapStatus(row: StatusRow) {
  return {
    id: row.id,
    trackingCode: row.tracking_code,
    customerName: row.customer_name,
    style: row.style,
    placement: row.placement,
    status: row.status,
    artistMessage: row.artist_message,
    paymentStatus: row.payment_status,
    proposedSlotStart: row.proposed_slot_start,
    createdAt: row.created_at,
  };
}

const statusSelect = `select id, tracking_code, customer_name, style, placement, status, artist_message, payment_status, proposed_slot_start, created_at
       from tattoo_requests`;

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
  const bytes = [...data.referenceImages, ...data.bodyImages].reduce((sum, value) => sum + value.length, 0);
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
    const rows = await sql.query<StatusRow>(`${statusSelect} where tracking_code = $1 limit 1`, [code]);
    return json({ items: rows.map(mapStatus) });
  }
  if (isIranMobile(phone)) {
    const rows = await sql.query<StatusRow>(
      `${statusSelect}
      where customer_phone = $1 or customer_phone_2 = $1
      order by created_at desc
      limit 20`,
      [phone],
    );
    return json({ items: rows.map(mapStatus) });
  }
  return json({ error: "کد پیگیری ۶ رقمی یا شماره موبایل را بنویس." }, 400);
}

async function handle(request: Request) {
  try {
    if (!sameOrigin(request)) return json({ error: "این درخواست مجاز نیست." }, 403);
    const url = new URL(request.url);
    if (url.searchParams.get("op") === "status") return await lookup(request);
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
