import { createFileRoute } from "@tanstack/react-router";
import { auth, authConfigured } from "@/lib/auth/server";
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
  if (!session?.user) return json({ error: "اول با گوگل وارد شو." }, 401);
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (password.length < 8) return json({ error: "رمز حداقل ۸ حرف باشد." }, 400);
  if (password.length > 128) return json({ error: "رمز خیلی بلند است." }, 400);

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const accounts = await ctx.internalAdapter.findAccounts(session.user.id);
  const credential = accounts.find((account: { providerId?: string }) => account.providerId === "credential");
  const owner = isStudioOwnerEmail(session.user.email);
  if (!credential) {
    await ctx.internalAdapter.linkAccount({
      userId: session.user.id,
      providerId: "credential",
      accountId: session.user.id,
      password: hash,
    });
  } else if (owner) {
    await ctx.internalAdapter.updatePassword(session.user.id, hash);
  } else {
    return json({ error: "رمز قبلاً گذاشته شده. برای عوض کردنش باید ایمیل بازیابی بیاید." }, 400);
  }
  return json({
    ok: true,
    email: session.user.email,
    message: "رمز ورود اپ ذخیره شد. در اپ همین ایمیل و همین رمز را بنویس.",
  });
}

export const Route = createFileRoute("/api/set-app-password")({
  server: { handlers: { POST: ({ request }) => handle(request) } },
});
