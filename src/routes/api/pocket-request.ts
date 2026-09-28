import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";
import { allowRate, clientKey } from "@/lib/server/rate-limit";
import { performPocketGuestRequest } from "@/lib/server/writes";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/pocket-request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const site = request.headers.get("sec-fetch-site");
        if (site && site !== "same-origin" && site !== "none") return json({ error: "درخواست معتبر نیست." }, 403);
        if (!allowRate(`pocket-request:${clientKey(request)}`, 12, 10 * 60 * 1000)) {
          return json({ error: "چند درخواست پشت سر هم آمد. کمی بعد دوباره بفرست." }, 429);
        }
        try {
          const body = await request.json();
          const result = await performPocketGuestRequest(body);
          return json(result);
        } catch (error) {
          if (error instanceof ZodError) return json({ error: "نام، شماره، محل و اندازه را کامل کن." }, 400);
          const message = error instanceof Error ? error.message : "ثبت نشد.";
          return json({ error: message }, 400);
        }
      },
    },
  },
});
