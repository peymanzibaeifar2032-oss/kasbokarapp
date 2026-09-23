import { createFileRoute } from "@tanstack/react-router";
import { auth, authConfigured } from "@/lib/auth/server";
import { findStoredEmail } from "@/lib/auth/stored-email";
import { getSql } from "@/lib/db";
import { takeAuthMailError } from "@/lib/mail";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function tellOwner(email: string) {
  const sql = await getSql();
  const owners = await sql.query<{ id: string }>(
    `select id from "user"
      where split_part(lower(email), '@', 2) in ('gmail.com', 'googlemail.com')
        and replace(split_part(lower(email), '@', 1), '.', '') = 'peymanzibaeifar2032'
      limit 1`,
  );
  const ownerId = owners[0]?.id;
  if (!ownerId) return;
  await sql.query(
    `insert into notifications (id, user_id, title, body, kind)
     values ($1,$2,$3,$4,'password_help')`,
    [
      crypto.randomUUID(),
      ownerId,
      "رمز مشتری فراموش شده",
      `${email} نمی‌تواند وارد شود. در پنل مدیریت، بخش رمز موقت، برایش رمز جدید بگذار و به خودش بگو.`,
    ],
  );
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
    await tellOwner(stored).catch(() => undefined);
    return json(
      {
        error:
          "پیوند به ایمیل نرفت. درخواست برای استودیو ثبت شد. به پیمان بگو تا یک رمز موقت برایت بگذارد.",
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
