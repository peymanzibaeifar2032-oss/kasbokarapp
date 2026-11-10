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
  PARTS,
  CHAPTERS,
  PUBLISHED_CHAPTERS,
  isPublished,
  lessonView,
  readingIsLive,
  GLOSSARY_READING,
  READINGS,
  replacedOldLessonIds,
  tableOfContents,
} from "@/lib/tattoo-curriculum/index.ts";
import { lessonPlainText } from "@/lib/tattoo-curriculum/plain.ts";

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

/** The installed app only reads /modules, /lessons and /lesson. Serve the book there. */
function codeModules() {
  return PARTS.map((part) => ({
    id: `cur-mod-${part.id}`,
    title: part.title,
    description: part.description,
    order: part.order,
  }));
}

function codeCatalog(moduleId: string) {
  const partId = moduleId.slice("cur-mod-".length);
  const lessons = LESSONS.filter((lesson) => lesson.part === partId && isPublished(lesson)).map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    order: lesson.order,
    groupId: `cur-grp-${lesson.chapter}`,
  }));
  const groups = CHAPTERS.filter((chapter) => chapter.part === partId)
    .map((chapter) => ({
      id: `cur-grp-${chapter.id}`,
      title: chapter.title,
      order: chapter.order,
      lessons: lessons.filter((lesson) => lesson.groupId === `cur-grp-${chapter.id}`),
    }))
    .filter((group) => group.lessons.length > 0);
  return { groups, lessons };
}

function codeLesson(id: string) {
  const lesson = LESSONS.find((item) => item.id === id);
  if (!lesson || !isPublished(lesson)) return null;
  return {
    id: lesson.id,
    moduleId: `cur-mod-${lesson.part}`,
    title: lesson.title,
    content: lessonPlainText(lesson),
    order: lesson.order,
    images: lesson.images.map((image, index) => ({
      id: image.id,
      lessonId: lesson.id,
      path: `/api/tattoo/curriculum-image/${image.id}`,
      caption: image.caption || image.alt,
      order: index + 1,
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
      if (head === "curriculum") return json({ parts: tableOfContents(), archivedOldLessonIds: replacedOldLessonIds(), glossaryReading: { id: GLOSSARY_READING, title: READINGS[GLOSSARY_READING] } });
      if (head === "curriculum-lesson" && arg) {
        const lesson = curriculumLesson(arg);
        if (!lesson) return json({ error: "این درس هنوز منتشر نشده." }, 404);
        return json({ lesson });
      }
      if (head === "curriculum-image" && arg) return curriculumImage(arg);
      if (head === "curriculum-reading" && arg) {
        const { READING_TEXT } = await import("@/lib/tattoo-curriculum/readings.generated.ts");
        if (!readingIsLive(arg) || !READING_TEXT[arg]) return json({ error: "این متن هنوز منتشر نشده." }, 404);
        return json({ id: arg, markdown: READING_TEXT[arg] });
      }
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
    if (head === "modules" && request.method === "GET") {
      const modules = await listPublicModules();
      const book = modules.filter((item) => item.id.startsWith("cur-mod-"));
      if (book.length) return json({ modules: book });
      if (!modules.length) return json({ modules: codeModules() });
      return json({ modules });
    }
    if (head === "lessons" && arg && request.method === "GET") {
      const catalog = await listPublicLessons(arg);
      if (catalog.lessons.length || !arg.startsWith("cur-mod-")) return json(catalog);
      return json(codeCatalog(arg));
    }
    if (head === "lesson" && arg && request.method === "GET") {
      const lesson = await publicLesson(arg);
      if (lesson) return json({ lesson });
      const seeded = (await listPublicModules()).some((item) => item.id.startsWith("cur-mod-"));
      const fallback = !seeded ? codeLesson(arg) : null;
      if (fallback) return json({ lesson: fallback });
      return json({ error: "این درس منتشر نشده." }, 404);
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
      }
      let saved = await askQuestion(access.id, access.device_id, lessonId, questionText);
      if ("error" in saved && saved.status === 404 && lessonId?.startsWith("cur-")) {
        const lesson = LESSONS.find((item) => item.id === lessonId);
        questionText = `[${lesson?.id} — ${lesson?.title}]\n${body.questionText}`;
        saved = await askQuestion(access.id, access.device_id, null, questionText);
      }
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
