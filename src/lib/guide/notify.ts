type NotifyPayload = {
  id: string;
  severity: string;
  role: string;
  route?: string | null;
  intent: string;
  expected?: string;
  actual?: string;
  reporterEmail?: string | null;
  userId?: string | null;
  conversationId?: string | null;
  attachmentUrl?: string | null;
};

function summary(p: NotifyPayload) {
  const flag = p.severity === "critical" ? "بحرانی" : p.severity;
  return [
    `[کسب‌وکار] گزارش باگ ${flag}`,
    `شناسه: ${p.id}`,
    `نقش: ${p.role}${p.reporterEmail ? ` · ${p.reporterEmail}` : p.userId ? ` · ${p.userId}` : " · مهمان"}`,
    `صفحه: ${p.route ?? "—"}`,
    `قصد: ${p.intent}`,
    p.conversationId ? `گفتگو: ${p.conversationId}` : "",
    p.attachmentUrl ? `پیوست: ${p.attachmentUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function postJson(url: string, body: unknown) {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Database remains the source of truth. Notifications are fire-and-forget. */
export async function notifyBug(payload: NotifyPayload): Promise<boolean> {
  const text = summary(payload);
  const webhook = process.env.BUG_NOTIFY_WEBHOOK_URL?.trim();
  const emailTo = process.env.BUG_NOTIFY_EMAIL?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.BUG_NOTIFY_FROM_EMAIL?.trim() || "کسب‌وکار <noreply@kasbokarapp.com>";
  let sent = false;

  if (webhook) {
    try {
      const telegram = /api\.telegram\.org\/bot/i.test(webhook);
      const chatId = process.env.BUG_NOTIFY_TELEGRAM_CHAT_ID?.trim();
      if (telegram && chatId) {
        await postJson(webhook.replace(/\/$/, "") + "/sendMessage", { chat_id: chatId, text });
      } else {
        await postJson(webhook, {
          text,
          content: text,
          source: "kasbokar-guide",
          ...payload,
        });
      }
      sent = true;
    } catch {
      /* keep going */
    }
  }

  if (payload.severity === "critical" && emailTo && resendKey) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [emailTo],
          subject: `[کسب‌وکار] باگ بحرانی ${payload.id}`,
          text,
        }),
      });
      sent = true;
    } catch {
      /* never fail the user flow */
    }
  }

  return sent;
}
