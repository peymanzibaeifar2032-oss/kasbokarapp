import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/lib/env.server";
import { getSql } from "@/lib/db";
import { performVerifyPayment } from "@/lib/finance/server";
import { paymentsEnabled } from "@/lib/finance/providers";

export const Route = createFileRoute("/api/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!paymentsEnabled()) return Response.json({ ok: false }, { status: 503 });
        const secret = env("VANDAR_WEBHOOK_SECRET");
        const hdr = request.headers.get("x-vandar-secret") || request.headers.get("authorization") || "";
        if (!secret || !hdr.includes(secret)) return Response.json({ ok: false }, { status: 401 });
        const body = (await request.json().catch(() => ({}))) as { payment_id?: string; token?: string; event_id?: string };
        const pid = body.payment_id || body.token;
        if (!pid) return Response.json({ ok: false }, { status: 400 });
        const sql = await getSql();
        if (body.event_id) {
          await sql.query(
            `insert into provider_events (id, provider, event_id, kind, payload_safe)
             values ($1,'vandar',$2,'webhook','{}'::jsonb)
             on conflict do nothing`,
            [crypto.randomUUID(), body.event_id],
          );
        }
        const row = await sql.query<{ id: string }>(
          `select id from payments where id = $1 or provider_payment_id = $1 limit 1`,
          [pid],
        );
        if (!row[0]) return Response.json({ ok: true, ignored: true });
        await performVerifyPayment(row[0].id);
        return Response.json({ ok: true });
      },
    },
  },
});
