import { env } from "@/lib/env.server";

export async function sendAuthMail(opts: { to: string; subject: string; text: string }) {
  const key = env("RESEND_API_KEY");
  const from = env("AUTH_FROM_EMAIL") || env("BUG_NOTIFY_FROM_EMAIL") || "کسب‌وکار <noreply@kasbokarapp.com>";
  if (!key) {
    throw new Error("بازیابی رمز هنوز روی این سرور تنظیم نشده.");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
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
}
