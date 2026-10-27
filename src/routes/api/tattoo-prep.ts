import { createFileRoute } from "@tanstack/react-router";
import { z, ZodError } from "zod";
import { getSql } from "@/lib/db";
import { getLlmProvider } from "@/lib/guide/provider";
import { allowRate, clientKey } from "@/lib/server/rate-limit";

const projectSchema = z.object({
  deviceId: z.string().trim().min(8).max(80),
  id: z.string().trim().min(4).max(80),
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional(),
  idea: z.string().trim().max(2000).optional(),
  placement: z.string().trim().max(120).optional(),
  sizeCm: z.string().trim().max(40).optional(),
  style: z.string().trim().max(80).optional(),
  colorMode: z.enum(["color", "bw"]).optional(),
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

async function ensureTable() {
  const sql = await getSql();
  await sql.query(`create table if not exists tattoo_prep_projects (
    id text primary key,
    device_id text not null,
    name text not null,
    phone text not null default '',
    idea text not null default '',
    placement text not null default '',
    size_cm text not null default '',
    style text not null default '',
    color_mode text not null default 'bw',
    updated_at timestamptz not null default now()
  )`);
  return sql;
}

async function saveProject(body: unknown) {
  const data = projectSchema.parse(body);
  const sql = await ensureTable();
  await sql.query(
    `insert into tattoo_prep_projects
      (id, device_id, name, phone, idea, placement, size_cm, style, color_mode, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
     on conflict (id) do update set
       name=excluded.name, phone=excluded.phone, idea=excluded.idea, placement=excluded.placement,
       size_cm=excluded.size_cm, style=excluded.style, color_mode=excluded.color_mode, updated_at=now()
     where tattoo_prep_projects.device_id = excluded.device_id`,
    [
      data.id,
      data.deviceId,
      data.name,
      data.phone || "",
      data.idea || "",
      data.placement || "",
      data.sizeCm || "",
      data.style || "",
      data.colorMode || "bw",
    ],
  );
  return json({ ok: true });
}

async function listProjects(body: unknown) {
  const data = z.object({ deviceId: z.string().trim().min(8).max(80) }).parse(body);
  const sql = await ensureTable();
  const rows = await sql.query<{
    id: string;
    name: string;
    phone: string;
    idea: string;
    placement: string;
    size_cm: string;
    style: string;
    color_mode: string;
    updated_at: string;
  }>(
    `select id, name, phone, idea, placement, size_cm, style, color_mode, updated_at
       from tattoo_prep_projects where device_id=$1 order by updated_at desc limit 200`,
    [data.deviceId],
  );
  return json({
    projects: rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      idea: row.idea,
      placement: row.placement,
      sizeCm: row.size_cm,
      style: row.style,
      colorMode: row.color_mode === "color" ? "color" : "bw",
      updatedAt: row.updated_at,
    })),
  });
}

async function removeProject(body: unknown) {
  const data = z.object({ deviceId: z.string().trim().min(8).max(80), id: z.string().trim().min(4).max(80) }).parse(body);
  const sql = await ensureTable();
  await sql.query(`delete from tattoo_prep_projects where id=$1 and device_id=$2`, [data.id, data.deviceId]);
  return json({ ok: true });
}

function designPrompt(idea: string, style: string, colorMode: string) {
  const color =
    colorMode === "color"
      ? "Limited tattoo colors may sit inside the lines. Shadows stay black stipple dots, not airbrush."
      : "Black ink only. No gray wash and no soft gray.";
  return [
    "Tattoo stencil sketch on a pure white background.",
    "Bold, clean, closed black outlines. Lines are sharp and readable, thick enough to tattoo, not a photo and not messy pencil.",
    "Every shadow is stipple dotwork: small black dots, dense in dark areas and sparse in light areas.",
    "No smooth gradient, no airbrush, no fog, no skin texture, no body, no hands, no photo mockup, no watermark, no letters, no frame.",
    color,
    `Subject: ${style || "tattoo sketch"}.`,
    `Idea: ${idea}`,
  ].join(" ");
}

async function imageData(item: { b64_json?: string; url?: string }) {
  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (!item.url || !/^https:\/\//.test(item.url)) return "";
  const response = await fetch(item.url);
  if (!response.ok) return "";
  const bytes = Buffer.from(await response.arrayBuffer());
  const type = response.headers.get("content-type")?.split(";")[0] || "image/png";
  if (!type.startsWith("image/")) return "";
  return `data:${type};base64,${bytes.toString("base64")}`;
}

async function generate(request: Request, body: unknown) {
  if (!allowRate(`tattoo-prep-image:${clientKey(request)}`, 6, 60 * 60 * 1000)) {
    return json({ error: "ساخت تصویر برای این ساعت تمام شد. کمی بعد دوباره بزن." }, 429);
  }
  const data = z.object({
    idea: z.string().trim().min(2).max(800),
    style: z.string().trim().max(80).optional(),
    colorMode: z.enum(["color", "bw"]).optional(),
    image: z.string().max(1_200_000).optional(),
  }).parse(body);
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) return json({ error: "ساخت تصویر الان در دسترس نیست." }, 503);
  const prompt = designPrompt(data.idea, data.style || "", data.colorMode || "bw");
  const image = data.image && data.image.startsWith("data:image/") ? data.image : "";
  const endpoint = image ? "https://api.x.ai/v1/images/edits" : "https://api.x.ai/v1/images/generations";
  const payload = image
    ? { model: "grok-imagine-image", prompt: `Redraw the reference as a tattoo stencil sketch. Keep bold clean outlines and stipple-dot shadows on white. ${prompt}`, response_format: "b64_json", image: { url: image, type: "image_url" } }
    : { model: "grok-imagine-image", prompt, n: 1, response_format: "b64_json" };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return json({ error: response.status === 429 ? "سرویس تصویر شلوغ است. کمی بعد دوباره بزن." : "ساخت طرح انجام نشد.", detail: detail.slice(0, 180) }, 502);
  }
  const result = (await response.json()) as { data?: { b64_json?: string; url?: string }[] };
  const picture = result.data?.[0] ? await imageData(result.data[0]) : "";
  if (!picture) return json({ error: "تصویری برنگشت." }, 502);
  return json({ image: picture });
}

async function caption(request: Request, body: unknown) {
  if (!allowRate(`tattoo-prep-caption:${clientKey(request)}`, 20, 60 * 60 * 1000)) {
    return json({ error: "چند کپشن پشت‌سرهم ساخته شد. کمی بعد دوباره بزن." }, 429);
  }
  const data = z.object({
    idea: z.string().trim().max(400).optional(),
    style: z.string().trim().max(80).optional(),
    tone: z.enum(["short", "deep", "bold"]).optional(),
  }).parse(body);
  const tone = data.tone === "deep" ? "کمی عمیق و آرام" : data.tone === "bold" ? "کوتاه و محکم" : "ساده و کم‌حرف";
  const fallback = `کار تازه.\n${data.style ? `سبک: ${data.style}\n` : ""}#تاتو #تاتوآرتیست #کرمانشاه #رئال #بلک_اند_گری #tattoo #tattooartist`;
  const result = await getLlmProvider().complete(
    [
      { role: "system", content: "یک کپشن اینستاگرام فارسی برای عکس تاتو بنویس. بدون ایموجی زیاد. حداکثر چهار خط و هشت هشتگ مرتبط. فقط خود کپشن را برگردان." },
      { role: "user", content: `لحن: ${tone}. موضوع: ${data.idea || "تاتو تازه"}. سبک: ${data.style || "رئال"}.` },
    ],
    { maxTokens: 220 },
  );
  return json({ caption: result.ok ? result.text : fallback });
}

async function handle(request: Request) {
  try {
    if (!sameOrigin(request)) return json({ error: "این درخواست مجاز نیست." }, 403);
    const body = await request.json().catch(() => null);
    const op = new URL(request.url).searchParams.get("op");
    if (op === "save") return await saveProject(body);
    if (op === "list") return await listProjects(body);
    if (op === "delete") return await removeProject(body);
    if (op === "generate") return await generate(request, body);
    if (op === "caption") return await caption(request, body);
    return json({ error: "این درخواست مجاز نیست." }, 404);
  } catch (error) {
    if (error instanceof ZodError) return json({ error: "اطلاعات را کامل کن." }, 400);
    return json({ error: "انجام نشد." }, 400);
  }
}

export const Route = createFileRoute("/api/tattoo-prep")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
