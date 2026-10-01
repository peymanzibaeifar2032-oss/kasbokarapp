import { z } from "zod";
import { getSql } from "@/lib/db";
import { isIranMobile, normalizeInstagramHandle, normalizeIranPhone } from "@/lib/format";

export type StudioFillIn = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerPhone2: string;
  customerInstagram: string;
  idea: string;
  placement: string;
  sizeCm: string;
  note: string;
  priceToman: number;
  paidToman: number;
  designImage: string;
  designs: { image: string; priceToman: number; sizeCm: string }[];
  sessionMinutes: number;
  callCount: number;
  cameCount: number;
  missedCount: number;
  ongoing: boolean;
  historyMinutes: number;
  status: "waiting" | "filled" | "dropped";
  createdAt: string;
};

type Row = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_phone_2: string | null;
  customer_instagram: string | null;
  idea: string;
  placement: string;
  size_cm: string | null;
  note: string | null;
  price_toman: number | null;
  paid_toman: number | null;
  design_image: string | null;
  designs: unknown;
  session_minutes: number | null;
  call_count: number | null;
  came_count: number | null;
  missed_count: number | null;
  ongoing: boolean | null;
  status: "waiting" | "filled" | "dropped";
  created_at: string;
};

function mapRow(row: Row): StudioFillIn {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerPhone2: row.customer_phone_2 || "",
    customerInstagram: row.customer_instagram || "",
    idea: row.idea,
    placement: row.placement,
    sizeCm: row.size_cm || "",
    note: row.note || "",
    priceToman: Number(row.price_toman) || 0,
    paidToman: Number(row.paid_toman) || 0,
    designImage: row.design_image || "",
    designs: readDesigns(row),
    sessionMinutes: Number(row.session_minutes) || 0,
    callCount: Number(row.call_count) || 0,
    cameCount: Number(row.came_count) || 0,
    missedCount: Number(row.missed_count) || 0,
    ongoing: Boolean(row.ongoing),
    historyMinutes: 0,
    status: row.status,
    createdAt: row.created_at,
  };
}

function readDesigns(row: Row) {
  const raw = Array.isArray(row.designs) ? row.designs : [];
  const parsed = raw
    .map((item) => {
      const design = item && typeof item === "object" ? (item as { image?: unknown; priceToman?: unknown; sizeCm?: unknown }) : {};
      return {
        image: typeof design.image === "string" ? design.image : "",
        priceToman: Number(design.priceToman) || 0,
        sizeCm: typeof design.sizeCm === "string" ? design.sizeCm : "",
      };
    })
    .filter((design) => design.image || design.priceToman || design.sizeCm)
    .slice(0, 5);
  if (parsed.length) return parsed;
  if (row.design_image || row.price_toman || row.size_cm) {
    return [{ image: row.design_image || "", priceToman: Number(row.price_toman) || 0, sizeCm: row.size_cm || "" }];
  }
  return [];
}

const designInput = z.object({
  image: z.string().max(700_000).optional(),
  priceToman: z.number().int().min(0).max(2_000_000_000).optional(),
  sizeCm: z.string().trim().max(60).optional(),
});

function cleanDesigns(raw: z.infer<typeof designInput>[] | undefined) {
  const designs = (raw || [])
    .slice(0, 5)
    .map((design) => ({
      image: design.image || "",
      priceToman: design.priceToman || 0,
      sizeCm: design.sizeCm?.trim() || "",
    }))
    .filter((design) => design.image || design.priceToman || design.sizeCm);
  for (const design of designs) {
    if (design.image && !/^data:image\/(jpeg|png|webp);base64,/i.test(design.image)) {
      throw new Error("فرمت تصویر طرح معتبر نیست.");
    }
  }
  return designs;
}

export async function performListStudioFillIns(userId: string, requireAdmin: (userId: string) => Promise<unknown>) {
  await requireAdmin(userId);
  const sql = await getSql();
  const rows = await sql.query<Row>(
    `select id, customer_name, customer_phone, customer_phone_2, customer_instagram, idea, placement, size_cm, note, price_toman, paid_toman, design_image, designs, session_minutes, call_count, came_count, missed_count, ongoing, status, created_at
       from studio_fill_ins
      where owner_id = $1 and status <> 'dropped'
      order by case when status = 'waiting' then 0 else 1 end, created_at desc
      limit 80`,
    [userId],
  );
  const mapped = rows.map(mapRow);
  const tails = [...new Set(mapped.map((row) => row.customerPhone.replace(/\D/g, "").slice(-10)).filter((tail) => tail.length >= 10))];
  if (tails.length) {
    try {
      const history = await sql.query<{ tail: string; minutes: number }>(
        `select right(regexp_replace(coalesce(t.customer_phone, ''), '\\D', '', 'g'), 10) as tail,
                round(percentile_cont(0.5) within group (order by t.session_minutes))::int as minutes
           from tattoo_requests t
           join bookings b on b.id = t.booking_id
           join businesses biz on biz.id = b.business_id
          where biz.owner_id = $1
            and t.status = 'booked'
            and b.status <> 'cancelled'
            and coalesce(t.session_minutes, 0) >= 30
            and right(regexp_replace(coalesce(t.customer_phone, ''), '\\D', '', 'g'), 10) = any($2::text[])
          group by 1`,
        [userId, tails],
      );
      const byTail = new Map(history.map((row) => [row.tail, Number(row.minutes) || 0]));
      for (const row of mapped) {
        const tail = row.customerPhone.replace(/\D/g, "").slice(-10);
        row.historyMinutes = byTail.get(tail) || 0;
      }
    } catch {
      // The list still loads. A missing past-session time only skips the guess.
    }
  }
  return mapped;
}

export async function performAddStudioFillIn(userId: string, raw: unknown, requireAdmin: (userId: string) => Promise<unknown>) {
  await requireAdmin(userId);
  const data = z
    .object({
      customerName: z.string().trim().min(2).max(80),
      customerPhone: z.string().trim().max(40),
      customerPhone2: z.string().trim().max(40).optional(),
      customerInstagram: z.string().trim().max(80).optional(),
      idea: z.string().trim().max(500).optional(),
      placement: z.string().trim().max(120).optional(),
      sizeCm: z.string().trim().max(60).optional(),
      note: z.string().trim().max(300).optional(),
      priceToman: z.number().int().min(0).max(2_000_000_000).optional(),
      paidToman: z.number().int().min(0).max(2_000_000_000).optional(),
      designImage: z.string().max(1_400_000).optional(),
      designs: z.array(designInput).max(5).optional(),
      sessionMinutes: z.number().int().min(30).max(480),
      ongoing: z.boolean().optional(),
    })
    .parse(raw);
  const phone = normalizeIranPhone(data.customerPhone);
  if (!isIranMobile(phone)) throw new Error("شماره موبایل ایرانی معتبر وارد کنید.");
  let phone2: string | null = null;
  if (data.customerPhone2?.trim()) {
    phone2 = normalizeIranPhone(data.customerPhone2);
    if (!isIranMobile(phone2)) throw new Error("شماره دوم معتبر نیست.");
  }
  const designs = cleanDesigns(data.designs);
  const first = designs[0];
  const legacyImage = first?.image || data.designImage || "";
  if (legacyImage && !/^data:image\/(jpeg|png|webp);base64,/i.test(legacyImage)) {
    throw new Error("فرمت تصویر طرح معتبر نیست.");
  }
  const total = designs.reduce((sum, design) => sum + design.priceToman, 0);
  const sql = await getSql();
  const id = crypto.randomUUID();
  await sql.query(
    `insert into studio_fill_ins
      (id, owner_id, customer_name, customer_phone, customer_phone_2, customer_instagram, idea, placement, size_cm, note, price_toman, paid_toman, design_image, designs, session_minutes, ongoing)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16)`,
    [
      id,
      userId,
      data.customerName,
      phone,
      phone2,
      normalizeInstagramHandle(data.customerInstagram) || null,
      data.idea?.trim() || "",
      data.placement?.trim() || "هماهنگ در استودیو",
      first?.sizeCm || data.sizeCm?.trim() || null,
      data.note?.trim() || null,
      total || data.priceToman || 0,
      data.paidToman ?? 0,
      legacyImage || null,
      JSON.stringify(designs),
      data.sessionMinutes,
      Boolean(data.ongoing),
    ],
  );
  return { id };
}

export async function performUpdateStudioFillIn(userId: string, raw: unknown, requireAdmin: (userId: string) => Promise<unknown>) {
  await requireAdmin(userId);
  const data = z
    .object({
      id: z.string(),
      customerName: z.string().trim().min(2).max(80),
      customerPhone: z.string().trim().max(40),
      customerPhone2: z.string().trim().max(40).optional(),
      customerInstagram: z.string().trim().max(80).optional(),
      sizeCm: z.string().trim().max(60).optional(),
      note: z.string().trim().max(300).optional(),
      priceToman: z.number().int().min(0).max(2_000_000_000).optional(),
      paidToman: z.number().int().min(0).max(2_000_000_000).optional(),
      designImage: z.string().max(1_400_000).optional(),
      designs: z.array(designInput).max(5).optional(),
      sessionMinutes: z.number().int().min(30).max(480),
      ongoing: z.boolean(),
    })
    .parse(raw);
  const phone = normalizeIranPhone(data.customerPhone);
  if (!isIranMobile(phone)) throw new Error("شماره موبایل ایرانی معتبر وارد کنید.");
  let phone2: string | null = null;
  if (data.customerPhone2?.trim()) {
    phone2 = normalizeIranPhone(data.customerPhone2);
    if (!isIranMobile(phone2)) throw new Error("شماره دوم معتبر نیست.");
  }
  const designs = data.designs ? cleanDesigns(data.designs) : null;
  const first = designs?.[0];
  const legacyImage = first?.image || data.designImage || "";
  if (legacyImage && !/^data:image\/(jpeg|png|webp);base64,/i.test(legacyImage)) {
    throw new Error("فرمت تصویر طرح معتبر نیست.");
  }
  const total = designs ? designs.reduce((sum, design) => sum + design.priceToman, 0) : data.priceToman ?? 0;
  const sql = await getSql();
  const updated = await sql.query(
    `update studio_fill_ins
        set customer_name = $3,
            customer_phone = $4,
            customer_phone_2 = $5,
            customer_instagram = $6,
            size_cm = $7,
            note = $8::text,
            idea = case when $8::text is null or btrim($8::text) = '' then idea else $8::text end,
            price_toman = $9,
            paid_toman = $10,
            session_minutes = $11,
            ongoing = $12,
            design_image = case when $13::text is null then design_image else nullif($13::text, '') end,
            designs = case when $14::jsonb is null then designs else $14::jsonb end
      where id = $1 and owner_id = $2
      returning id`,
    [
      data.id,
      userId,
      data.customerName,
      phone,
      phone2,
      normalizeInstagramHandle(data.customerInstagram) || null,
      first?.sizeCm || data.sizeCm?.trim() || null,
      data.note?.trim() || null,
      total,
      data.paidToman ?? 0,
      data.sessionMinutes,
      data.ongoing,
      designs ? legacyImage : null,
      designs ? JSON.stringify(designs) : null,
    ],
  );
  if (!updated[0]) throw new Error("این نفر در لیست انتظار پیدا نشد.");
  return { ok: true as const };
}

export async function performSetStudioFillIn(userId: string, raw: unknown, requireAdmin: (userId: string) => Promise<unknown>) {
  await requireAdmin(userId);
  const data = z.object({ id: z.string(), status: z.enum(["waiting", "filled", "dropped"]) }).parse(raw);
  const sql = await getSql();
  await sql.query(
    `update studio_fill_ins
        set status = $3, filled_at = case when $3 = 'filled' then now() else filled_at end
      where id = $1 and owner_id = $2`,
    [data.id, userId, data.status],
  );
  return { ok: true as const };
}

export async function performSetStudioFillInMinutes(userId: string, raw: unknown, requireAdmin: (userId: string) => Promise<unknown>) {
  await requireAdmin(userId);
  const data = z.object({ id: z.string(), sessionMinutes: z.number().int().min(30).max(480) }).parse(raw);
  const sql = await getSql();
  await sql.query(
    `update studio_fill_ins set session_minutes = $3 where id = $1 and owner_id = $2`,
    [data.id, userId, data.sessionMinutes],
  );
  return { ok: true as const };
}

export async function performMarkStudioFillIn(userId: string, raw: unknown, requireAdmin: (userId: string) => Promise<unknown>) {
  await requireAdmin(userId);
  const data = z.object({ id: z.string(), mark: z.enum(["called", "missed", "came"]) }).parse(raw);
  const column = data.mark === "called" ? "call_count" : data.mark === "missed" ? "missed_count" : "came_count";
  const sql = await getSql();
  await sql.query(
    `update studio_fill_ins
        set ${column} = ${column} + 1,
            status = case when $3 = 'came' and ongoing = false then 'filled' else status end,
            filled_at = case when $3 = 'came' and ongoing = false then now() else filled_at end
      where id = $1 and owner_id = $2`,
    [data.id, userId, data.mark],
  );
  return { ok: true as const };
}

export async function performSetStudioFillInPlan(userId: string, raw: unknown, requireAdmin: (userId: string) => Promise<unknown>) {
  await requireAdmin(userId);
  const data = z.object({ id: z.string(), ongoing: z.boolean() }).parse(raw);
  const sql = await getSql();
  await sql.query(`update studio_fill_ins set ongoing = $3 where id = $1 and owner_id = $2`, [data.id, userId, data.ongoing]);
  return { ok: true as const };
}
