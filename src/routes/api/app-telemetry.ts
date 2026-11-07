import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { installSchema, performAppTelemetryInstall } from "@/lib/server/app-analytics";
import { allowRate, clientKey } from "@/lib/server/rate-limit";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const bodySchema = installSchema.extend({ type: z.literal("install") });

export const Route = createFileRoute("/api/app-telemetry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!allowRate(`app-telemetry:${clientKey(request)}`, 20, 60 * 60 * 1000)) {
          return json({ error: "درخواست زیاد است." }, 429);
        }
        if (Number(request.headers.get("content-length") || 0) > 2048) return json({ error: "بدنه بزرگ است." }, 413);
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "بدنه نامعتبر است." }, 400);
        }
        try {
          const { type: _type, ...data } = bodySchema.parse(raw);
          // Anonymous route: never binds an account. Signed-in apps use the session-bound save action.
          await performAppTelemetryInstall(null, data);
          return json({ ok: true });
        } catch (err) {
          return json({ error: err instanceof z.ZodError ? "داده نامعتبر است." : "ثبت نشد." }, 400);
        }
      },
    },
  },
});
