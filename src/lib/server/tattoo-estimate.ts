import { z } from "zod";
import { getSql } from "@/lib/db";
import {
  estimateTattooPrice,
  type EstimateDraft,
  type EstimateSample,
  type TattooEstimate,
} from "@/lib/tattoo-estimate";

type Sql = Awaited<ReturnType<typeof getSql>>;

const imageData = /^data:image\/(jpeg|png|webp);base64,/i;

export async function storeRequestImages(
  sql: Sql,
  requestId: string,
  images: { kind: string; data: string }[],
) {
  const kept = images.filter((image) => imageData.test(image.data)).slice(0, 8);
  if (!kept.length) return { reference: [] as string[], body: [] as string[] };
  const reference: string[] = [];
  const body: string[] = [];
  for (const image of kept) {
    const id = crypto.randomUUID();
    const kind = ["placement", "current", "reference", "sketch"].includes(image.kind) ? image.kind : "reference";
    await sql.query(`insert into tattoo_request_files (id, request_id, kind, data) values ($1,$2,$3,$4)`, [
      id,
      requestId,
      kind,
      image.data,
    ]);
    const url = `/api/tattoo-file?id=${id}`;
    if (kind === "placement" || kind === "current") body.push(url);
    else reference.push(url);
  }
  await sql.query(`update tattoo_requests set reference_images=$2::jsonb, body_images=$3::jsonb where id=$1`, [
    requestId,
    JSON.stringify(reference),
    JSON.stringify(body),
  ]);
  return { reference, body };
}

async function loadSamples(sql: Sql, exceptId: string): Promise<EstimateSample[]> {
  const rows = await sql.query<{
    id: string;
    customer_name: string;
    price_min_toman: number;
    request_type: string;
    placement: string;
    style: string;
    size_cm: string;
    color_mode: string | null;
    is_price_anchor: boolean | null;
  }>(
    `select id, customer_name, price_min_toman, request_type, placement, style, size_cm, color_mode, is_price_anchor
       from tattoo_requests
      where id <> $1 and price_min_toman > 0`,
    [exceptId],
  );
  const anchors = await sql.query<{
    id: string;
    title: string;
    price_toman: number;
    request_type: string;
    placement: string;
    style: string;
    size_cm: string;
    color_mode: string;
  }>(`select id, title, price_toman, request_type, placement, style, size_cm, color_mode from tattoo_price_anchors where price_toman > 0`);
  const learned = await sql.query<{
    id: string;
    customer_name: string;
    final_price: number;
    request_type: string;
    placement: string;
    style: string;
    size_cm: string;
    color_mode: string | null;
  }>(
    `select f.id, r.customer_name, f.final_price, r.request_type, r.placement, r.style, r.size_cm, r.color_mode
       from tattoo_price_feedback f
       join tattoo_requests r on r.id = f.request_id
      where f.final_price > 0 and coalesce(r.price_min_toman, 0) = 0`,
  );
  return [
    ...rows.map((row) => ({
      id: row.id,
      title: row.customer_name,
      priceToman: Number(row.price_min_toman),
      requestType: row.request_type,
      placement: row.placement,
      style: row.style,
      sizeCm: row.size_cm,
      colorMode: row.color_mode || "",
      anchor: Boolean(row.is_price_anchor),
    })),
    ...anchors.map((row) => ({
      id: row.id,
      title: row.title,
      priceToman: Number(row.price_toman),
      requestType: row.request_type,
      placement: row.placement,
      style: row.style,
      sizeCm: row.size_cm,
      colorMode: row.color_mode,
      anchor: true,
    })),
    ...learned.map((row) => ({
      id: row.id,
      title: row.customer_name,
      priceToman: Number(row.final_price),
      requestType: row.request_type,
      placement: row.placement,
      style: row.style,
      sizeCm: row.size_cm,
      colorMode: row.color_mode || "",
      anchor: false,
    })),
  ];
}

async function loadRatios(sql: Sql) {
  const rows = await sql.query<{ estimate_min: number | null; estimate_max: number | null; final_price: number }>(
    `select estimate_min, estimate_max, final_price from tattoo_price_feedback
      where final_price > 0 order by created_at desc limit 30`,
  );
  return rows
    .map((row) => {
      const mid = ((Number(row.estimate_min) || 0) + (Number(row.estimate_max) || 0)) / 2;
      if (mid <= 0) return 0;
      return Number(row.final_price) / mid;
    })
    .filter((ratio) => ratio > 0);
}

export async function finalizeNewTattooRequest(
  sql: Sql,
  requestId: string,
  input: EstimateDraft & {
    colorMode: string;
    bodySide?: string;
    sizeMode?: string;
    styles?: string[];
    images?: { kind: string; data: string }[];
  },
) {
  await sql.query(
    `update tattoo_requests set body_side=$2, color_mode=$3, size_mode=$4, styles=$5::jsonb where id=$1`,
    [requestId, input.bodySide || null, input.colorMode || null, input.sizeMode || null, JSON.stringify(input.styles || [])],
  );
  if (input.images?.length) await storeRequestImages(sql, requestId, input.images);
  const estimate = await saveTattooEstimate(sql, requestId, input);
  return { estimateMin: estimate.minToman, estimateMax: estimate.maxToman };
}

async function saveTattooEstimate(sql: Sql, requestId: string, draft: EstimateDraft) {
  const estimate = estimateTattooPrice(draft, await loadSamples(sql, requestId), await loadRatios(sql));
  await sql.query(
    `update tattoo_requests set
       estimate_min_toman=$2, estimate_max_toman=$3, estimate_minutes=$4, estimate_sessions=$5,
       complexity_score=$6, estimate_confidence=$7, updated_at=now()
     where id=$1`,
    [requestId, estimate.minToman, estimate.maxToman, estimate.minutes, estimate.sessions, estimate.complexity, estimate.confidence],
  );
  return estimate;
}

export async function explainTattooEstimate(sql: Sql, requestId: string): Promise<TattooEstimate | null> {
  const rows = await sql.query<{
    request_type: string;
    placement: string;
    style: string;
    size_cm: string;
    color_mode: string | null;
    idea: string;
    reference_images: unknown;
    body_images: unknown;
  }>(
    `select request_type, placement, style, size_cm, color_mode, idea, reference_images, body_images
       from tattoo_requests where id=$1`,
    [requestId],
  );
  const row = rows[0];
  if (!row) return null;
  const images = (value: unknown) => (Array.isArray(value) ? value.length : 0);
  return estimateTattooPrice(
    {
      requestType: row.request_type,
      placement: row.placement,
      style: row.style,
      sizeCm: row.size_cm,
      colorMode: row.color_mode || "",
      idea: row.idea,
      imageCount: images(row.reference_images) + images(row.body_images),
    },
    await loadSamples(sql, requestId),
    await loadRatios(sql),
  );
}

export async function performExplainTattooPrice(userId: string, raw: unknown, requireAdmin: (userId: string) => Promise<void>) {
  await requireAdmin(userId);
  const data = z.object({ requestId: z.string() }).parse(raw);
  const sql = await getSql();
  const estimate = await explainTattooEstimate(sql, data.requestId);
  if (!estimate) throw new Error("درخواست پیدا نشد.");
  return estimate;
}

export async function performSaveTattooPriceFeedback(userId: string, raw: unknown, requireAdmin: (userId: string) => Promise<void>) {
  await requireAdmin(userId);
  const data = z.object({
    requestId: z.string(),
    verdict: z.enum(["low", "ok", "high"]),
    finalPrice: z.number().int().positive(),
  }).parse(raw);
  const sql = await getSql();
  const rows = await sql.query<{ estimate_min_toman: number | null; estimate_max_toman: number | null }>(
    `select estimate_min_toman, estimate_max_toman from tattoo_requests where id=$1`,
    [data.requestId],
  );
  if (!rows[0]) throw new Error("درخواست پیدا نشد.");
  await sql.query(
    `insert into tattoo_price_feedback (id, request_id, estimate_min, estimate_max, final_price, verdict)
     values ($1,$2,$3,$4,$5,$6)`,
    [crypto.randomUUID(), data.requestId, rows[0].estimate_min_toman, rows[0].estimate_max_toman, data.finalPrice, data.verdict],
  );
  return { ok: true as const };
}

export async function performSaveTattooPriceAnchor(userId: string, raw: unknown, requireAdmin: (userId: string) => Promise<void>) {
  await requireAdmin(userId);
  const data = z.object({
    title: z.string().trim().min(2).max(80),
    requestType: z.enum(["new", "coverup", "consultation", "custom", "repair", "continuation"]),
    placement: z.string().trim().max(120),
    style: z.string().trim().max(240),
    sizeCm: z.string().trim().max(80),
    colorMode: z.string().trim().max(40).optional(),
    priceToman: z.number().int().positive(),
    minutes: z.number().int().min(10).max(2000).optional(),
  }).parse(raw);
  const sql = await getSql();
  await sql.query(
    `insert into tattoo_price_anchors
      (id, owner_user_id, title, request_type, placement, style, size_cm, color_mode, price_toman, minutes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [crypto.randomUUID(), userId, data.title, data.requestType, data.placement, data.style, data.sizeCm, data.colorMode || "", data.priceToman, data.minutes ?? null],
  );
  return { ok: true as const };
}

export async function performToggleTattooPriceAnchor(userId: string, raw: unknown, requireAdmin: (userId: string) => Promise<void>) {
  await requireAdmin(userId);
  const data = z.object({ requestId: z.string() }).parse(raw);
  const sql = await getSql();
  const rows = await sql.query<{ price_min_toman: number | null; is_price_anchor: boolean }>(
    `select price_min_toman, is_price_anchor from tattoo_requests where id=$1`,
    [data.requestId],
  );
  if (!rows[0]) throw new Error("درخواست پیدا نشد.");
  if (!(Number(rows[0].price_min_toman) > 0)) throw new Error("فقط کاری که قیمت نهایی بزرگ‌تر از صفر دارد می‌تواند نمونه مهم باشد.");
  await sql.query(`update tattoo_requests set is_price_anchor = not is_price_anchor where id=$1`, [data.requestId]);
  return { ok: true as const };
}
