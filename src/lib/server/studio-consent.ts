import { z } from "zod";
import type { getSql } from "@/lib/db";
import { makeTattooTrackingCode } from "@/lib/tattoo-flow";

const imageDataSchema = z.string().max(1_200_000).refine(
  (value) => /^data:image\/(jpeg|png|webp);base64,/i.test(value),
  "فرمت تصویر معتبر نیست.",
);

const consentInput = z.object({
  customerName: z.string().trim().min(2).max(80),
  nationalId: z.string().trim().min(10).max(10),
  phone: z.string().trim().min(10).max(20),
  placement: z.string().trim().min(2).max(120),
  sizeCm: z.string().trim().min(1).max(40),
  priceToman: z.number().int().min(0).max(5_000_000_000),
  paidToman: z.number().int().min(0).max(5_000_000_000),
  inkCode: z.string().trim().max(40).optional(),
  needleCode: z.string().trim().max(40).optional(),
  designImage: imageDataSchema,
});

async function ensureConsentTable(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql.query(
    `create table if not exists studio_consents (
      id text primary key,
      user_id text not null,
      code text not null unique,
      customer_name text not null,
      national_id text not null,
      phone text not null,
      placement text not null,
      size_cm text not null,
      design_image text not null,
      price_toman bigint not null default 0,
      paid_toman bigint not null default 0,
      created_at timestamptz not null default now()
    )`,
  );
  await sql.query(`alter table studio_consents add column if not exists price_toman bigint not null default 0`);
  await sql.query(`alter table studio_consents add column if not exists paid_toman bigint not null default 0`);
  await sql.query(`alter table studio_consents add column if not exists ink_code text not null default ''`);
  await sql.query(`alter table studio_consents add column if not exists needle_code text not null default ''`);
}

export async function performSaveStudioConsent(sql: Awaited<ReturnType<typeof getSql>>, userId: string, raw: unknown) {
  const data = consentInput.parse(raw);
  await ensureConsentTable(sql);
  let code = makeTattooTrackingCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const id = crypto.randomUUID();
      await sql.query(
        `insert into studio_consents (id, user_id, code, customer_name, national_id, phone, placement, size_cm, design_image, price_toman, paid_toman, ink_code, needle_code)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [id, userId, code, data.customerName, data.nationalId, data.phone, data.placement, data.sizeCm, data.designImage, data.priceToman, data.paidToman, data.inkCode || "", data.needleCode || ""],
      );
      return { id, code };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/duplicate|unique/i.test(message) || attempt === 4) throw error;
      code = makeTattooTrackingCode();
    }
  }
  throw new Error("کد رضایت‌نامه ساخته نشد.");
}

export async function performListStudioConsents(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  await ensureConsentTable(sql);
  const rows = await sql.query<{ code: string; customer_name: string; phone: string; created_at: string }>(
    `select code, customer_name, phone, created_at
       from studio_consents
      where user_id = $1
      order by created_at desc
      limit 40`,
    [userId],
  );
  return rows.map((row) => ({
    code: row.code,
    customerName: row.customer_name,
    phone: row.phone,
    createdAt: row.created_at,
  }));
}

export async function performStudioConsent(sql: Awaited<ReturnType<typeof getSql>>, userId: string, raw: unknown) {
  const data = z.object({ code: z.string().trim().min(4).max(12) }).parse(raw);
  await ensureConsentTable(sql);
  const rows = await sql.query<{
    code: string;
    customer_name: string;
    national_id: string;
    phone: string;
    placement: string;
    size_cm: string;
    design_image: string;
    price_toman: string | number;
    paid_toman: string | number;
    ink_code: string | null;
    needle_code: string | null;
    created_at: string;
  }>(
    `select code, customer_name, national_id, phone, placement, size_cm, design_image,
            coalesce(price_toman, 0) as price_toman, coalesce(paid_toman, 0) as paid_toman,
            coalesce(ink_code, '') as ink_code, coalesce(needle_code, '') as needle_code, created_at
       from studio_consents
      where user_id = $1 and code = $2
      limit 1`,
    [userId, data.code],
  );
  const row = rows[0];
  if (!row) throw new Error("این کد رضایت‌نامه پیدا نشد.");
  return {
    code: row.code,
    customerName: row.customer_name,
    nationalId: row.national_id,
    phone: row.phone,
    placement: row.placement,
    sizeCm: row.size_cm,
    priceToman: Number(row.price_toman) || 0,
    paidToman: Number(row.paid_toman) || 0,
    inkCode: row.ink_code || "",
    needleCode: row.needle_code || "",
    designImage: row.design_image,
    createdAt: row.created_at,
  };
}
