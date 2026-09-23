import { createFileRoute } from "@tanstack/react-router";
import { auth, authConfigured } from "@/lib/auth/server";
import { findStoredEmail } from "@/lib/auth/stored-email";
import { takeAuthMailError } from "@/lib/mail";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function handle(request: Request) {
  if (!authConfigured) return json({ error: "ورود فعال نیست." }, 503);
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email.includes("@")) return json({ error: "ایمیل را درست بنویس." }, 400);

  const stored = await findStoredEmail(email);
  if (!stored) {
    const hint =
      /ziba/i.test(email) && /2032/.test(email)
        ? " ایمیل ذخیره‌شده peyman.zibaeifar2032@gmail.com است."
        : "";
    return json(
      {
        error:
          "این ایمیل در حساب‌ها نیست." +
          hint +
          " اگر با گوگل وارد شده‌ای، در مرورگر کروم وارد شو و از صفحه حساب رمز اپ را بگذار.",
      },
      404,
    );
  }

  await auth.api.requestPasswordReset({
    body: { email: stored, redirectTo: "/login" },
    headers: request.headers,
  });
  const mailError = takeAuthMailError();
  if (mailError) {
    return json(
      {
        error:
          "پیوند به ایمیل نرفت. سرور نامه نمی‌فرستد. در مرورگر کروم با گوگل وارد شو، برو به حساب، و همان‌جا رمز ورود اپ را تعیین کن.",
      },
      503,
    );
  }
  return json({
    ok: true,
    message: `پیوند بازیابی به ${stored} فرستاده شد. پوشهٔ هرزنامه را هم نگاه کن.`,
  });
}

export const Route = createFileRoute("/api/password-reset")({
  server: { handlers: { POST: ({ request }) => handle(request) } },
});
