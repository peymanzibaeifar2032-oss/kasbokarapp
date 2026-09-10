import { z } from "zod";

export const bugSeverity = z.enum(["low", "medium", "critical"]);
export const bugStatus = z.enum(["new", "reviewing", "resolved", "closed"]);
export const bugRole = z.enum(["guest", "user", "owner", "admin"]);

export function safeHttpUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString().slice(0, 400);
  } catch {
    return undefined;
  }
}

export const bugInputSchema = z.object({
  role: bugRole,
  pageUrl: z.string().min(1).max(400),
  routePath: z.string().max(200).optional(),
  intent: z.string().min(8).max(400),
  expected: z.string().min(8).max(400),
  actual: z.string().min(8).max(600),
  device: z.string().max(80).optional(),
  browser: z.string().max(80).optional(),
  userAgent: z.string().max(300).optional(),
  occurredAt: z.string().max(40).optional(),
  reproducible: z.boolean().optional(),
  steps: z.string().max(800).optional(),
  severity: bugSeverity,
  appVersion: z.string().max(40).optional(),
  conversationId: z.string().max(80).optional(),
  attachmentUrl: z.string().max(400).optional(),
});

export type BugInput = z.infer<typeof bugInputSchema>;

export function validateBug(raw: unknown): { ok: true; data: BugInput } | { ok: false; error: string } {
  const parsed = bugInputSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "گزارش ناقص است.";
    return { ok: false, error: faBugError(msg) };
  }
  const data = parsed.data;
  const steps = data.steps?.trim() ?? "";
  if (data.severity !== "critical" && steps.length < 8) {
    return { ok: false, error: "برای گزارش عادی، مراحل بازتولید را بنویسید. بدون مراحل فقط گزارش بحرانی ثبت می‌شود." };
  }
  const attachmentUrl = safeHttpUrl(data.attachmentUrl);
  return { ok: true, data: { ...data, attachmentUrl } };
}

function faBugError(msg: string) {
  if (/Too small|at least/i.test(msg)) return "متن را کامل‌تر بنویسید.";
  return msg;
}

export type BugRow = {
  id: string;
  user_id: string | null;
  reporter_email: string | null;
  conversation_id: string | null;
  role: string;
  page_url: string;
  route_path: string | null;
  intent: string;
  expected_result: string;
  actual_result: string;
  device: string | null;
  browser: string | null;
  user_agent: string | null;
  occurred_at: string | null;
  reproducible: boolean | null;
  steps: string | null;
  severity: string;
  status: string;
  app_version: string | null;
  attachment_url: string | null;
  notified_at: string | null;
  created_at: string;
};
