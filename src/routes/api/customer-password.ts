import { createFileRoute } from "@tanstack/react-router";
import { auth, authConfigured } from "@/lib/auth/server";
import { findStoredEmail } from "@/lib/auth/stored-email";
import { getSql } from "@/lib/db";
import { isStudioOwnerEmail } from "@/lib/studio-owner";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function handle(request: Request) {
  if (!authConfigured) return json({ error: "ورود فعال نیست." }, 503);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || !isStudioOwnerEmail(session.user.email)) {
    return json({ error: "فقط مدیر استودیو می‌تواند رمز مشتری را بگذارد." }, 403);
  }
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email.includes("@")) return json({ error: "ایمیل مشتری را بنویس." }, 400);
  if (password.length < 8) return json({ error: "رمز موقت حداقل ۸ حرف باشد." }, 400);
  const stored = await findStoredEmail(email);
  if (!stored) return json({ error: "با این ایمیل حسابی ساخته نشده." }, 404);
  if (isStudioOwnerEmail(stored)) return json({ error: "رمز مدیر از اینجا عوض نمی‌شود." }, 400);
  const sql = await getSql();
  const users = await sql.query<{ id: string }>(`select id from "user" where lower(email) = lower($1) limit 1`, [stored]);
  const userId = users[0]?.id;
  if (!userId) return json({ error: "حساب پیدا نشد." }, 404);
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const accounts = await ctx.internalAdapter.findAccounts(userId);
  const credential = accounts.find((account: { providerId?: string }) => account.providerId === "credential");
  if (!credential) {
    await ctx.internalAdapter.linkAccount({
      userId,
      providerId: "credential",
      accountId: userId,
      password: hash,
    });
  } else {
    await ctx.internalAdapter.updatePassword(userId, hash);
  }
  return json({ ok: true, email: stored, message: `رمز موقت برای ${stored} ذخیره شد. همان را به مشتری بگو.` });
}

export const Route = createFileRoute("/api/customer-password")({
  server: { handlers: { POST: ({ request }) => handle(request) } },
});
