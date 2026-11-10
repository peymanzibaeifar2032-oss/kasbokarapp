import { createFileRoute } from "@tanstack/react-router";
import { ZodError, z } from "zod";
import { allowRate, clientKey } from "@/lib/server/rate-limit";
import {
  accessFromToken,
  activateLearnCode,
  askQuestion,
  bearerToken,
  lessonImage,
  listPublicLessons,
  listPublicModules,
  myQuestions,
  publicLesson,
} from "@/lib/tattoo-learn/store.server";
import { auth, authConfigured } from "@/lib/auth/server";
import { isStudioOwnerEmail } from "@/lib/studio-owner";
import { createHash } from "node:crypto";
import {
  LESSONS,
  PUBLISHED_CHAPTERS,
  isPublished,
  lessonView,
  replacedOldLessonIds,
  tableOfContents,
} from "@/lib/tattoo-curriculum/index.ts";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function ownerCookie(request: Request) {
  if (!authConfigured) return false;
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  return isStudioOwnerEmail(session?.user?.email);
}

async function student(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  return accessFromToken(token);
}

function parts(request: Request) {
  const path = new URL(request.url).pathname.replace(/\/+$/, "");
  const tail = path.split("/api/tattoo/")[1] || "";
  return tail.split("/").filter(Boolean);
}

async function imageResponse(imageId: string) {
  const data = await lessonImage(imageId);
  const match = data.match(/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return json({ error: "تصویر پیدا نشد." }, 404);
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  return new Response(bytes, {
    headers: {
      "Content-Type": match[1].toLowerCase(),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** v2 curriculum: content ships with the code; the DB is not touched. */
function curriculumLesson(id: string) {
  const view = lessonView(id);
  if (!view) return null;
  return {
    ...view,
    images: view.images.map((image) => ({ ...image, path: `/api/tattoo/curriculum-image/${image.id}` })),
  };
}

async function curriculumImage(slotId: string) {
  const lesson = LESSONS.find((item) => item.images.some((image) => image.id === slotId));
  if (!lesson || !isPublished(lesson)) return json({ error: "تصویر پیدا نشد." }, 404);
  const { CURRICULUM_IMAGES } = await import("@/lib/tattoo-curriculum/images.generated.ts");
  const data = CURRICULUM_IMAGES[slotId];
  if (!data) return json({ error: "تصویر پیدا نشد." }, 404);
  return new Response(Buffer.from(data, "base64"), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}

/** Public, content-free release check: which lessons are live and a hash of each one's text. */
function curriculumStatus() {
  return {
    version: "curriculum-v2",
    publishedChapters: PUBLISHED_CHAPTERS,
    lessons: LESSONS.map((lesson) => ({
      id: lesson.id,
      chapter: lesson.chapter,
      published: isPublished(lesson),
      images: lesson.images.length,
      hash: createHash("sha256").update(JSON.stringify(lesson)).digest("hex").slice(0, 16),
    })),
  };
}

async function dispatch(request: Request) {
  try {
    const [head, arg] = parts(request);
    if (head === "image" && arg && request.method === "GET") {
      const allowed = (await student(request)) || (await ownerCookie(request));
      if (!allowed) return json({ error: "دسترسی تصویر نیست." }, 401);
      return imageResponse(arg);
    }
    if (head === "curriculum-status" && request.method === "GET") return json(curriculumStatus());
    if (head?.startsWith("curriculum") && request.method === "GET") {
      const allowed = (await student(request)) || (await ownerCookie(request));
      if (!allowed) return json({ error: "اول کد فعال‌سازی را بزن." }, 401);
      if (head === "curriculum") return json({ parts: tableOfContents(), archivedOldLessonIds: replacedOldLessonIds() });
      if (head === "curriculum-lesson" && arg) {
        const lesson = curriculumLesson(arg);
        if (!lesson) return json({ error: "این درس هنوز منتشر نشده." }, 404);
        return json({ lesson });
      }
      if (head === "curriculum-image" && arg) return curriculumImage(arg);
    }
    if (head === "activate" && request.method === "POST") {
      if (!allowRate(`tattoo-learn-activate:${clientKey(request)}`, 12, 60 * 60 * 1000)) {
        return json({ error: "چند بار پشت‌سرهم تلاش شد. کمی بعد دوباره بزن." }, 429);
      }
      const body = z.object({
        code: z.string().trim().min(4).max(40),
        deviceId: z.string().trim().min(8).max(80),
      }).parse(await request.json());
      const result = await activateLearnCode(body.code, body.deviceId);
      if ("error" in result) return json({ error: result.error }, result.status);
      return json(result);
    }
    const access = await student(request);
    if (!access) return json({ error: "اول کد فعال‌سازی را بزن." }, 401);
    if (head === "modules" && request.method === "GET") return json({ modules: await listPublicModules() });
    if (head === "lessons" && arg && request.method === "GET") return json(await listPublicLessons(arg));
    if (head === "lesson" && arg && request.method === "GET") {
      const lesson = await publicLesson(arg);
      if (!lesson) return json({ error: "این درس منتشر نشده." }, 404);
      return json({ lesson });
    }
    if (head === "question" && request.method === "POST") {
      if (!allowRate(`tattoo-learn-question:${access.id}`, 20, 60 * 60 * 1000)) {
        return json({ error: "سؤال‌های این ساعت زیاد شد. کمی بعد بفرست." }, 429);
      }
      const body = z.object({
        lessonId: z.string().trim().min(4).max(80).nullable().optional(),
        questionText: z.string().trim().min(2).max(4000),
      }).parse(await request.json());
      let lessonId = body.lessonId || null;
      let questionText = body.questionText;
      if (lessonId?.startsWith("cur-")) {
        const lesson = LESSONS.find((item) => item.id === lessonId);
        if (!lesson || !isPublished(lesson)) return json({ error: "این درس پیدا نشد." }, 404);
        questionText = `[${lesson.id} — ${lesson.title}]\n${questionText}`;
        lessonId = null;
      }
      const saved = await askQuestion(access.id, access.device_id, lessonId, questionText);
      if ("error" in saved) return json({ error: saved.error }, saved.status);
      return json(saved);
    }
    if (head === "my-questions" && request.method === "GET") {
      return json({ questions: await myQuestions(access.id) });
    }
    return json({ error: "این درخواست مجاز نیست." }, 404);
  } catch (error) {
    if (error instanceof ZodError) return json({ error: "اطلاعات را کامل کن." }, 400);
    const missing = error instanceof Error && /tattoo_modules|does not exist/i.test(error.message);
    return json({ error: missing ? "آموزش هنوز روی پایگاه نصب نشده." : "انجام نشد." }, 500);
  }
}

export const Route = createFileRoute("/api/tattoo/$")({
  server: {
    handlers: {
      GET: ({ request }) => dispatch(request),
      POST: ({ request }) => dispatch(request),
    },
  },
});
