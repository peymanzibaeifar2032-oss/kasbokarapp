import { createFileRoute } from "@tanstack/react-router";
import { z, ZodError } from "zod";
import { apprenticeTutorPrompt, retrieveLessons } from "@/lib/apprentice-lessons";
import { getLlmProvider } from "@/lib/guide/provider";
import { allowRate, clientKey } from "@/lib/server/rate-limit";

const bodySchema = z.object({
  question: z.string().trim().min(2).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().max(800) }))
    .max(8)
    .optional(),
});

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function clean(text: string) {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value || !/[\u0600-\u06FF]/.test(value)) return "";
  if (/[0-9۰-۹]+[\s\d۰-۹٬,.]{0,12}(میلیون|تومان)/.test(value)) {
    return "قیمت و بیعانه مربوط به این کلاس نیست.";
  }
  return value.slice(0, 1200);
}

async function handle(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return json({ error: "درخواست معتبر نیست." }, 403);
  if (!allowRate(`apprentice-ask:${clientKey(request)}`, 24, 10 * 60 * 1000)) {
    return json({ answer: "چند سؤال پشت سر هم آمد. کمی بعد دوباره بپرس." });
  }
  try {
    const body = bodySchema.parse(await request.json());
    const lessons = retrieveLessons(body.question, 6);
    const result = await getLlmProvider().complete(
      [
        { role: "system", content: apprenticeTutorPrompt(lessons) },
        ...(body.history || []).map((item) => ({ role: item.role, content: item.content })),
        { role: "user", content: body.question },
      ],
      { maxTokens: 600 },
    );
    const answer = result.ok ? clean(result.text) : "";
    if (!answer) return json({ answer: "جواب زنده نرسید. یک بار دیگر بپرس." });
    return json({ answer });
  } catch (error) {
    if (error instanceof ZodError) return json({ error: "سؤال را کوتاه‌تر بنویس." }, 400);
    return json({ answer: "جواب زنده نرسید. یک بار دیگر بپرس." });
  }
}

export const Route = createFileRoute("/api/apprentice-ask")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
