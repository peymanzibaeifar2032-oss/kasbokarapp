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
  designImage: string;
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
  design_image: string | null;
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
    designImage: row.design_image || "",
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function performListStudioFillIns(userId: string, requireAdmin: (userId: string) => Promise<unknown>) {
  await requireAdmin(userId);
  const sql = await getSql();
  const rows = await sql.query<Row>(
    `select id, customer_name, customer_phone, customer_phone_2, customer_instagram, idea, placement, size_cm, note, price_toman, design_image, status, created_at
       from studio_fill_ins
      where owner_id = $1 and status <> 'dropped'
      order by case when status = 'waiting' then 0 else 1 end, created_at desc
      limit 80`,
    [userId],
  );
  return rows.map(mapRow);
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
      designImage: z.string().max(1_400_000).optional(),
    })
    .parse(raw);
  const phone = normalizeIranPhone(data.customerPhone);
  if (!isIranMobile(phone)) throw new Error("شماره موبایل ایرانی معتبر وارد کنید.");
  let phone2: string | null = null;
  if (data.customerPhone2?.trim()) {
    phone2 = normalizeIranPhone(data.customerPhone2);
    if (!isIranMobile(phone2)) throw new Error("شماره دوم معتبر نیست.");
  }
  if (data.designImage && !/^data:image\/(jpeg|png|webp);base64,/i.test(data.designImage)) {
    throw new Error("فرمت تصویر طرح معتبر نیست.");
  }
  const sql = await getSql();
  const id = crypto.randomUUID();
  await sql.query(
    `insert into studio_fill_ins
      (id, owner_id, customer_name, customer_phone, customer_phone_2, customer_instagram, idea, placement, size_cm, note, price_toman, design_image)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      id,
      userId,
      data.customerName,
      phone,
      phone2,
      normalizeInstagramHandle(data.customerInstagram) || null,
      data.idea?.trim() || "",
      data.placement?.trim() || "هماهنگ در استودیو",
      data.sizeCm?.trim() || null,
      data.note?.trim() || null,
      data.priceToman ?? 0,
      data.designImage || null,
    ],
  );
  return { id };
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
