import { z } from "zod";
import { getSql } from "@/lib/db";
import { isIranMobile, normalizeIranPhone } from "@/lib/format";
import { isOccupancyConflict } from "@/lib/server/admin-bootstrap";
import { allowRate, clientKey } from "@/lib/server/rate-limit";
import { TATTOO_SLOT_OVERLAP_SQL } from "@/lib/server/tattoo-holds";

const receiptImageSchema = z
  .string()
  .max(1_400_000)
  .refine((value) => /^data:image\/(jpeg|png|webp);base64,/i.test(value), "فرمت رسید معتبر نیست.");

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function loadOwned(requestId: string, phone: string) {
  const sql = await getSql();
  const rows = await sql.query<{
    id: string;
    customer_id: string | null;
    business_id: string | null;
    customer_name: string;
    idea: string;
    style: string;
    proposed_slot_start: string | null;
    proposed_slot_end: string | null;
    payment_status: string;
    payment_hold_until: string | null;
  }>(
    `select id, customer_id, business_id, customer_name, idea, style,
            proposed_slot_start, proposed_slot_end, payment_status, payment_hold_until
       from tattoo_requests
      where id = $1 and (customer_phone = $2 or customer_phone_2 = $2)
      limit 1`,
    [requestId, phone],
  );
  return { sql, row: rows[0] || null };
}

export async function acceptGuestByPhone(request: Request) {
  if (!allowRate(`tattoo-accept:${clientKey(request)}`, 12, 60 * 60 * 1000)) {
    return json({ error: "چند بار پشت‌سرهم زدی. کمی بعد دوباره امتحان کن." }, 429);
  }
  const body = z
    .object({ requestId: z.string().min(8), phone: z.string().trim().max(40) })
    .parse(await request.json().catch(() => ({})));
  const phone = normalizeIranPhone(body.phone);
  if (!isIranMobile(phone)) return json({ error: "شماره موبایل را درست بنویس." }, 400);
  const { sql, row } = await loadOwned(body.requestId, phone);
  if (!row) return json({ error: "این درخواست با این شماره پیدا نشد." }, 404);
  if (row.payment_status !== "proposal_pending" || !row.proposed_slot_start || !row.proposed_slot_end) {
    return json({ error: "این پیشنهاد قابل تأیید نیست." }, 400);
  }
  if (new Date(row.proposed_slot_start).getTime() < Date.now() + 10 * 60000) {
    return json({ error: "زمان پیشنهادی گذشته است. از پیمان زمان تازه بخواه." }, 400);
  }
  if (!row.business_id) return json({ error: "این پیشنهاد هنوز کامل نیست." }, 400);
  const overlap = await sql.query<{ id: string }>(TATTOO_SLOT_OVERLAP_SQL, [
    row.business_id,
    row.proposed_slot_start,
    row.proposed_slot_end,
  ]);
  if (overlap[0]) return json({ error: "این زمان دیگر آزاد نیست. از پیمان زمان تازه بخواه." }, 409);
  const bookingId = crypto.randomUUID();
  try {
    await sql.query(
      `insert into bookings (id, business_id, customer_id, customer_name, customer_phone, slot_start, slot_end, kind, source, event_type, note, status, service_title, party_size)
       values ($1,$2,$3,$4,$5,$6,$7,'booking','online','booking',$8,'requested',$9,1)`,
      [
        bookingId,
        row.business_id,
        row.customer_id,
        row.customer_name,
        phone,
        row.proposed_slot_start,
        row.proposed_slot_end,
        row.idea,
        row.style,
      ],
    );
  } catch (err) {
    if (isOccupancyConflict(err)) return json({ error: "این زمان همین الان رزرو شد. از پیمان زمان تازه بخواه." }, 409);
    throw err;
  }
  await sql.query(
    `update tattoo_requests
        set booking_id=$2, payment_status='awaiting_payment', payment_hold_until=now()+interval '6 hours', updated_at=now()
      where id=$1 and payment_status='proposal_pending'`,
    [row.id, bookingId],
  );
  const owners = await sql.query<{ owner_id: string }>("select owner_id from businesses where id=$1", [row.business_id]);
  if (owners[0]) {
    await sql.query(
      `insert into notifications (id, user_id, title, body, kind, booking_id, business_id)
       values ($1,$2,$3,$4,'tattoo_proposal_accepted',$5,$6)`,
      [
        crypto.randomUUID(),
        owners[0].owner_id,
        "زمان پیشنهادی پذیرفته شد",
        `${row.customer_name} زمان را پذیرفت؛ مهلت پرداخت ۶ ساعته آغاز شد.`,
        bookingId,
        row.business_id,
      ],
    );
  }
  return json({ ok: true, bookingId });
}

export async function submitGuestReceiptByPhone(request: Request) {
  if (!allowRate(`tattoo-receipt:${clientKey(request)}`, 12, 60 * 60 * 1000)) {
    return json({ error: "چند بار پشت‌سرهم زدی. کمی بعد دوباره امتحان کن." }, 429);
  }
  const body = z
    .object({
      requestId: z.string().min(8),
      phone: z.string().trim().max(40),
      receiptImage: receiptImageSchema,
    })
    .parse(await request.json().catch(() => ({})));
  const phone = normalizeIranPhone(body.phone);
  if (!isIranMobile(phone)) return json({ error: "شماره موبایل را درست بنویس." }, 400);
  const { sql, row } = await loadOwned(body.requestId, phone);
  if (!row) return json({ error: "این درخواست با این شماره پیدا نشد." }, 404);
  if (row.payment_status !== "awaiting_payment" && row.payment_status !== "rejected") {
    return json({ error: "الان نوبت ارسال رسید نیست. اول زمان را تأیید کن." }, 400);
  }
  if (!row.payment_hold_until || new Date(row.payment_hold_until).getTime() <= Date.now()) {
    await sql.query(
      `update bookings set status='cancelled' where id in (select booking_id from tattoo_requests where id=$1) and status='requested'`,
      [row.id],
    );
    await sql.query(
      `update tattoo_requests set payment_status='expired', booking_id=null, updated_at=now() where id=$1 and payment_status in ('awaiting_payment','rejected')`,
      [row.id],
    );
    return json({ error: "مهلت پرداخت تمام شد. وقت آزاد شد؛ از پیمان زمان تازه بخواه." }, 400);
  }
  await sql.query(
    `update tattoo_requests
        set payment_status='receipt_submitted', payment_submitted_at=now(), payment_review_deadline=now()+interval '12 hours',
            receipt_image=$2, updated_at=now()
      where id=$1`,
    [row.id, body.receiptImage],
  );
  const admins = await sql.query<{ user_id: string }>("select user_id from profiles where is_admin=true");
  for (const admin of admins) {
    await sql.query(
      `insert into notifications (id, user_id, title, body, kind, business_id)
       values ($1,$2,$3,$4,'tattoo_receipt_submitted',$5)`,
      [crypto.randomUUID(), admin.user_id, "رسید پرداخت جدید", `رسید بیعانه از ${row.customer_name} رسید.`, row.business_id],
    );
  }
  return json({ ok: true });
}
