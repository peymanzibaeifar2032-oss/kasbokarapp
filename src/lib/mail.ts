import { env } from "@/lib/env.server";

async function sendSmtp(opts: { to: string; subject: string; text: string; from: string }) {
  const host = env("SMTP_HOST");
  if (!host) return false;
  const { default: nodemailer } = await import("nodemailer");
  const port = Number(env("SMTP_PORT") || "587");
  const secure = env("SMTP_SECURE") === "true" || port === 465;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      env("SMTP_USER") && env("SMTP_PASS")
        ? { user: env("SMTP_USER"), pass: env("SMTP_PASS") }
        : undefined,
  });
  await transporter.sendMail({
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  });
  return true;
}

async function sendResend(opts: { to: string; subject: string; text: string; from: string }) {
  const key = env("RESEND_API_KEY");
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(JSON.stringify({ level: "error", src: "mail", status: res.status, body: body.slice(0, 200) }));
    throw new Error("ارسال ایمیل بازیابی انجام نشد.");
  }
  return true;
}

export async function sendAuthMail(opts: { to: string; subject: string; text: string }) {
  const from =
    env("AUTH_FROM_EMAIL") || env("SMTP_FROM") || env("BUG_NOTIFY_FROM_EMAIL") || "کسب‌وکار <noreply@kasbokarapp.com>";
  if (await sendSmtp({ ...opts, from })) return;
  if (await sendResend({ ...opts, from })) return;
  throw new Error("بازیابی رمز هنوز روی این سرور تنظیم نشده.");
}
