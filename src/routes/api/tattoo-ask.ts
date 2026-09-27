import { createFileRoute } from "@tanstack/react-router";
import { z, ZodError } from "zod";
import { getLlmProvider } from "@/lib/guide/provider";
import { allowRate, clientKey } from "@/lib/server/rate-limit";
import { cleanAssistantAnswer, tattooAssistantPrompt } from "@/lib/tattoo-assistant";
import { STUDIO_CONTACT_PHONE } from "@/lib/tattoo-flow";

const bodySchema = z.object({
  question: z.string().trim().min(2).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().max(700) }))
    .max(8)
    .optional(),
});

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function handle(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return json({ error: "درخواست معتبر نیست." }, 403);
  if (!allowRate(`tattoo-ask:${clientKey(request)}`, 20, 10 * 60 * 1000)) {
    return json({ answer: `چند سؤال پشت سر هم آمد. کمی بعد دوباره بپرس، یا با ${STUDIO_CONTACT_PHONE} تماس بگیر.` });
  }
  try {
    const body = bodySchema.parse(await request.json());
    const result = await getLlmProvider().complete(
      [
        { role: "system", content: tattooAssistantPrompt() },
        ...(body.history || []).map((item) => ({ role: item.role, content: item.content })),
        { role: "user", content: body.question },
      ],
      { maxTokens: 400 },
    );
    if (!result.ok) {
      return json({ answer: `الان جواب این سؤال را ندارم. با ${STUDIO_CONTACT_PHONE} تماس بگیر.` });
    }
    return json({ answer: cleanAssistantAnswer(result.text) });
  } catch (error) {
    if (error instanceof ZodError) return json({ error: "سؤال را کوتاه‌تر بنویس." }, 400);
    return json({ answer: `الان جواب این سؤال را ندارم. با ${STUDIO_CONTACT_PHONE} تماس بگیر.` });
  }
}

export const Route = createFileRoute("/api/tattoo-ask")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
