import { createFileRoute } from "@tanstack/react-router";
import { z, ZodError } from "zod";
import { auth, authConfigured } from "@/lib/auth/server";
import { getSql } from "@/lib/db";
import { getLlmProvider } from "@/lib/guide/provider";
import { allowRate, clientKey } from "@/lib/server/rate-limit";
import { prepPrompt, type PrepTask, type StencilKind } from "@/lib/tattoo-prep/prompts";
import { isStudioOwnerEmail } from "@/lib/studio-owner";

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

function designPrompt(idea: string, style: string, colorMode: string, variation?: number) {
  return prepPrompt({ task: "design", idea, style, colorMode, variation });
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

async function ownerRequest(request: Request) {
  if (!authConfigured) return false;
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  return isStudioOwnerEmail(session?.user?.email);
}

async function requestImage(apiKey: string, prompt: string, image: string) {
  const withImage = Boolean(image);
  const attempts = withImage
    ? [
        {
          model: "grok-imagine-image-2.0",
          prompt,
          response_format: "b64_json" as const,
          resolution: "2k",
          image: { url: image, type: "image_url" as const },
        },
        {
          model: "grok-imagine-image",
          prompt,
          response_format: "b64_json" as const,
          image: { url: image, type: "image_url" as const },
        },
      ]
    : [
        { model: "grok-imagine-image-2.0", prompt, n: 1, response_format: "b64_json" as const, resolution: "2k" },
        { model: "grok-imagine-image", prompt, n: 1, response_format: "b64_json" as const },
      ];
  let status = 502;
  let detail = "";
  for (const payload of attempts) {
    const endpoint = withImage ? "https://api.x.ai/v1/images/edits" : "https://api.x.ai/v1/images/generations";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(90_000),
    });
    if (response.ok) {
      const result = (await response.json()) as { data?: { b64_json?: string; url?: string }[] };
      const picture = result.data?.[0] ? await imageData(result.data[0]) : "";
      if (picture) return { image: picture };
      detail = "empty";
      continue;
    }
    status = response.status;
    detail = (await response.text().catch(() => "")).slice(0, 180);
    if (status === 429) break;
  }
  return {
    error: status === 429 ? "سرویس تصویر شلوغ است. کمی بعد دوباره بزن." : "ساخت طرح انجام نشد.",
    detail,
    status,
  };
}

async function generate(request: Request, body: unknown) {
  if (!(await ownerRequest(request))) {
    return json({ error: "ساخت تصویر فقط از پنل مدیر ممکن است. با ایمیل استودیو وارد شو." }, 401);
  }
  if (!allowRate(`tattoo-prep-image:${clientKey(request)}`, 24, 60 * 60 * 1000)) {
    return json({ error: "سهم تصویر این ساعت تمام شد. کمی بعد دوباره بزن." }, 429);
  }
  const data = z
    .object({
      task: z.enum(["design", "extract", "stencil", "enhance"]).optional(),
      idea: z.string().trim().max(800).optional(),
      style: z.string().trim().max(120).optional(),
      colorMode: z.enum(["color", "bw"]).optional(),
      image: z.string().max(1_200_000).optional(),
      stencilMode: z.enum(["outline", "shading", "hatching"]).optional(),
      variation: z.number().int().min(1).max(3).optional(),
    })
    .parse(body);
  const task: PrepTask = data.task || "design";
  const image = data.image && data.image.startsWith("data:image/") ? data.image : "";
  const idea = data.idea || "";
  if (task !== "design" && !image) return json({ error: "اول عکس را بگذار." }, 400);
  if (task === "design" && !image && idea.trim().length < 2) return json({ error: "ایده را کمی بیشتر بنویس." }, 400);
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) return json({ error: "ساخت تصویر الان در دسترس نیست." }, 503);
  const stencilMode: StencilKind = data.stencilMode || "shading";
  const prompt =
    task === "design"
      ? designPrompt(idea, data.style || "", data.colorMode || "bw", data.variation)
      : prepPrompt({ task, idea, style: data.style, colorMode: data.colorMode, stencilMode, variation: data.variation });
  const result = await requestImage(apiKey, prompt, image);
  if ("error" in result) return json({ error: result.error, detail: result.detail }, result.status === 429 ? 429 : 502);
  return json({ image: result.image });
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
