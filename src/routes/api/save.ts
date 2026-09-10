import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";
import { auth, authConfigured } from "@/lib/auth/server";
import { UnauthorizedError } from "@/lib/auth/verify.server";
import { logError } from "@/lib/log";
import { dispatchSave } from "@/lib/server/writes";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function assertSameOrigin(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (!site || site === "same-origin" || site === "none") return;
  throw new Error("Forbidden: cross-site request blocked");
}

async function handle(request: Request) {
  try {
    assertSameOrigin(request);
    if (!authConfigured) return json({ error: "ورود فعال نیست." }, 503);
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new UnauthorizedError();
    const body = (await request.json().catch(() => null)) as { type?: unknown; payload?: unknown } | null;
    const type = typeof body?.type === "string" ? body.type : "";
    if (!type) return json({ error: "نوع درخواست مشخص نیست." }, 400);
    const result = await dispatchSave(session.user.id, type, body?.payload ?? {}, session.user.name ?? "کاربر");
    return json(result ?? { ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return json({ error: "لطفاً دوباره با ایمیل وارد شوید." }, 401);
    if (err instanceof ZodError) {
      const msg = err.issues[0]?.message || "اطلاعات را کامل کنید.";
      return json({ error: msg }, 400);
    }
    const message = err instanceof Error ? err.message : "انجام نشد.";
    const status = /Forbidden|دسترسی/.test(message) ? 403 : 400;
    logError("api.save", err, { status });
    return json({ error: message }, status);
  }
}

export const Route = createFileRoute("/api/save")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
