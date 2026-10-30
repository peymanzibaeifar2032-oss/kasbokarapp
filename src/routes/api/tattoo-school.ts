import { createFileRoute } from "@tanstack/react-router";
import { ZodError, z } from "zod";
import { auth, authConfigured } from "@/lib/auth/server";
import { isStudioOwnerEmail } from "@/lib/studio-owner";
import {
  answerQuestion,
  deleteLesson,
  deleteLessonImage,
  deleteModule,
  makeCodes,
  ownerPreview,
  packLessons,
  saveLesson,
  saveLessonImage,
  saveModule,
  schoolSnapshot,
  setAccessBlocked,
  setCodeActive,
} from "@/lib/tattoo-learn/store.server";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function owner(request: Request) {
  if (!authConfigured) return false;
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  return isStudioOwnerEmail(session?.user?.email);
}

const imageData = z.string().regex(/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i).max(1_400_000);

async function handle(request: Request) {
  try {
    const site = request.headers.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") return json({ error: "این درخواست مجاز نیست." }, 403);
    if (!(await owner(request))) return json({ error: "فقط از پنل مدیر." }, 401);
    const op = new URL(request.url).searchParams.get("op");
    const body = op === "snapshot" ? {} : await request.json().catch(() => ({}));
    if (op === "snapshot") return json(await schoolSnapshot());
    if (op === "save-module") {
      const data = z.object({
        id: z.string().trim().min(4).max(80).optional(),
        title: z.string().trim().min(2).max(120),
        description: z.string().trim().max(2000).optional(),
        order: z.number().int().min(0).max(999),
        isActive: z.boolean(),
      }).parse(body);
      return json(await saveModule({ ...data, description: data.description || "" }));
    }
    if (op === "delete-module") {
      const data = z.object({ id: z.string().trim().min(4).max(80) }).parse(body);
      await deleteModule(data.id);
      return json({ ok: true });
    }
    if (op === "save-lesson") {
      const data = z.object({
        id: z.string().trim().min(4).max(80).optional(),
        moduleId: z.string().trim().min(4).max(80),
        title: z.string().trim().min(2).max(160),
        content: z.string().max(80_000),
        order: z.number().int().min(0).max(999),
        isPublished: z.boolean(),
        groupId: z.string().trim().min(4).max(80).nullable().optional(),
      }).parse(body);
      return json(await saveLesson(data));
    }
    if (op === "pack-group") {
      const data = z.object({
        moduleId: z.string().trim().min(4).max(80),
        title: z.string().trim().min(2).max(80),
      }).parse(body);
      return json(await packLessons(data.moduleId, data.title));
    }
    if (op === "delete-lesson") {
      const data = z.object({ id: z.string().trim().min(4).max(80) }).parse(body);
      await deleteLesson(data.id);
      return json({ ok: true });
    }
    if (op === "save-image") {
      const data = z.object({
        id: z.string().trim().min(4).max(80).optional(),
        lessonId: z.string().trim().min(4).max(80),
        caption: z.string().trim().max(240).optional(),
        order: z.number().int().min(0).max(999),
        imageData: imageData.optional(),
      }).parse(body);
      if (!data.id && !data.imageData) return json({ error: "عکس را بگذار." }, 400);
      return json(await saveLessonImage({ ...data, caption: data.caption || "" }));
    }
    if (op === "delete-image") {
      const data = z.object({ id: z.string().trim().min(4).max(80) }).parse(body);
      await deleteLessonImage(data.id);
      return json({ ok: true });
    }
    if (op === "make-codes") {
      const data = z.object({
        count: z.number().int().min(1).max(30),
        maxDevices: z.number().int().min(1).max(5),
        note: z.string().trim().max(200).optional(),
        expiresAt: z.string().datetime().nullable().optional(),
      }).parse(body);
      const codes = await makeCodes(data.count, data.maxDevices, data.note || "", data.expiresAt || null);
      return json({ codes });
    }
    if (op === "set-code") {
      const data = z.object({ id: z.string().trim().min(4).max(80), isActive: z.boolean() }).parse(body);
      await setCodeActive(data.id, data.isActive);
      return json({ ok: true });
    }
    if (op === "set-access") {
      const data = z.object({ id: z.string().trim().min(4).max(80), blocked: z.boolean() }).parse(body);
      await setAccessBlocked(data.id, data.blocked);
      return json({ ok: true });
    }
    if (op === "answer") {
      const data = z.object({
        id: z.string().trim().min(4).max(80),
        answer: z.string().trim().min(1).max(8000),
      }).parse(body);
      await answerQuestion(data.id, data.answer);
      return json({ ok: true });
    }
    if (op === "preview") {
      const data = z.object({ id: z.string().trim().min(4).max(80) }).parse(body);
      const lesson = await ownerPreview(data.id);
      if (!lesson) return json({ error: "درس پیدا نشد." }, 404);
      return json({ lesson });
    }
    return json({ error: "این درخواست مجاز نیست." }, 404);
  } catch (error) {
    if (error instanceof ZodError) return json({ error: "اطلاعات را کامل کن." }, 400);
    const missing = error instanceof Error && /tattoo_modules|does not exist/i.test(error.message);
    return json({ error: missing ? "آموزش هنوز روی پایگاه نصب نشده." : "انجام نشد." }, 500);
  }
}

export const Route = createFileRoute("/api/tattoo-school")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
