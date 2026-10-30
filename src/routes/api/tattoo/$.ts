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

async function dispatch(request: Request) {
  try {
    const [head, arg] = parts(request);
    if (head === "image" && arg && request.method === "GET") {
      const allowed = (await student(request)) || (await ownerCookie(request));
      if (!allowed) return json({ error: "دسترسی تصویر نیست." }, 401);
      return imageResponse(arg);
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
    if (head === "lessons" && arg && request.method === "GET") return json({ lessons: await listPublicLessons(arg) });
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
      const saved = await askQuestion(access.id, access.device_id, body.lessonId || null, body.questionText);
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
