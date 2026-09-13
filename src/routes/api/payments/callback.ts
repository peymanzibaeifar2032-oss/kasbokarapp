import { createFileRoute } from "@tanstack/react-router";
import { performVerifyPayment } from "@/lib/finance/server";
import { paymentsEnabled } from "@/lib/finance/providers";

async function handle(request: Request) {
  if (!paymentsEnabled()) {
    return Response.json(
      { ok: false, status: "provider_disabled", message: "پرداخت در حال بررسی است. درگاه هنوز فعال نیست." },
      { status: 503 },
    );
  }
  const url = new URL(request.url);
  const pid = url.searchParams.get("pid") || url.searchParams.get("token");
  if (!pid) return Response.json({ ok: false, message: "شناسه پرداخت نیست." }, { status: 400 });
  try {
    const result = await performVerifyPayment(pid);
    return Response.json({ ok: result.ok, status: result.ok ? "paid" : "pending_review" });
  } catch {
    return Response.json({ ok: false, status: "pending_review", message: "پرداخت در حال بررسی است." });
  }
}

export const Route = createFileRoute("/api/payments/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
