import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { performAppTelemetryInstall } from "@/lib/server/app-analytics";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const bodySchema = z.object({
  type: z.literal("install"),
  installId: z.string().trim().min(16).max(80),
  accountEmail: z.string().trim().email().max(120).optional(),
  platform: z.string().trim().max(40).default("android"),
  appVersion: z.string().trim().max(40).optional(),
});

export const Route = createFileRoute("/api/app-telemetry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "بدنه نامعتبر است." }, 400);
        }
        try {
          const data = bodySchema.parse(raw);
          await performAppTelemetryInstall(null, data);
          return json({ ok: true });
        } catch (err) {
          const message = err instanceof Error ? err.message : "ثبت نشد.";
          return json({ error: message }, 400);
        }
      },
    },
  },
});
