import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";
import { auth, authConfigured } from "@/lib/auth/server";
import { getSql } from "@/lib/db";
import { validateBug, type BugRow } from "@/lib/guide/bugs";
import { notifyBug } from "@/lib/guide/notify";
import { buildSystemPrompt, parseModelJson } from "@/lib/guide/prompt";
import { getLlmProvider } from "@/lib/guide/provider";
import { clientKey, rateLimit } from "@/lib/guide/rate-limit";
import { isClearlyOffTopic, looksLikeInjection, redactSecrets } from "@/lib/guide/redact";
import { formatChunks, retrieveChunks } from "@/lib/guide/retrieve";
import {
  INJECTION_REPLY,
  MAX_BUG_HISTORY,
  MAX_GUIDE_HISTORY,
  MAX_GUIDE_MESSAGE,
  OUT_OF_SCOPE_LIMIT,
  OUT_OF_SCOPE_REPLY,
  shouldHardLockGuide,
} from "@/lib/guide/version";
import type { GuideAudience } from "@/lib/guide/knowledge";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function assertSameOrigin(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (!site || site === "same-origin" || site === "none") return;
  throw new Error("Forbidden: cross-site request blocked");
}

type Role = GuideAudience;

async function sessionUser(request: Request) {
  if (!authConfigured) return null;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return null;
    return {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
    };
  } catch {
    return null;
  }
}

async function resolveRole(userId: string | null): Promise<Role> {
  if (!userId) return "guest";
  const sql = await getSql();
  const profile = await sql.query<{ is_admin: boolean }>(
    "select is_admin from profiles where user_id = $1",
    [userId],
  );
  if (profile[0]?.is_admin) return "admin";
  const owned = await sql.query<{ c: number | string }>(
    "select count(*)::int as c from businesses where owner_id = $1",
    [userId],
  );
  if (Number(owned[0]?.c) > 0) return "owner";
  return "user";
}

function faqReply(query: string, role: Role) {
  const chunks = retrieveChunks(query, role, 2);
  const body = chunks[0]?.body ?? OUT_OF_SCOPE_REPLY;
  return {
    reply: `${body}\n\nاگر پاسخ هوشمند در دسترس نبود، همین راهنمای ثابت و فرم گزارش مشکل کار می‌کنند.`,
    mode: "faq" as const,
    oosStreak: 0,
    locked: false,
    aiAvailable: false,
  };
}

function parseHistory(raw: unknown, max: number) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-max)
    .map((row) => {
      const rec = row as { role?: unknown; content?: unknown };
      const r = rec.role === "assistant" ? "assistant" : "user";
      const content = redactSecrets(String(rec.content ?? "")).slice(0, MAX_GUIDE_MESSAGE);
      return { role: r as "user" | "assistant", content };
    })
    .filter((m) => m.content);
}

async function handleChat(
  payload: Record<string, unknown>,
  userId: string | null,
  role: Role,
  rateKey: string,
) {
  const message = redactSecrets(String(payload.message ?? "")).trim();
  if (message.length < 2) return json({ error: "پیام را بنویسید." }, 400);
  if (message.length > MAX_GUIDE_MESSAGE) return json({ error: "پیام کوتاه‌تر بنویسید." }, 400);

  const oosStreakIn = Math.max(0, Math.min(10, Number(payload.oosStreak) || 0));
  const path = String(payload.path ?? "/").slice(0, 200);
  const collectingBug = payload.collectingBug === true || payload.mode === "bug";
  const history = parseHistory(payload.history, collectingBug ? MAX_BUG_HISTORY : MAX_GUIDE_HISTORY);

  if (looksLikeInjection(message)) {
    const abuse = rateLimit(rateKey, "suspicious");
    if (!abuse.ok) return json({ error: `کمی صبر کنید؛ حدود ${abuse.retryMin} دقیقه دیگر.` }, 429);
    return json({
      reply: INJECTION_REPLY,
      mode: "out_of_scope",
      oosStreak: oosStreakIn,
      locked: false,
      aiAvailable: true,
    });
  }

  if (isClearlyOffTopic(message)) {
    const streak = oosStreakIn + 1;
    if (streak >= OUT_OF_SCOPE_LIMIT) {
      const abuse = rateLimit(rateKey, "suspicious");
      if (!abuse.ok) return json({ error: `کمی صبر کنید؛ حدود ${abuse.retryMin} دقیقه دیگر.` }, 429);
    }
    return json({
      reply: OUT_OF_SCOPE_REPLY,
      mode: "out_of_scope",
      oosStreak: streak,
      locked: shouldHardLockGuide(streak),
      aiAvailable: true,
    });
  }

  const knowledge = formatChunks(retrieveChunks(message, role, 5));
  const provider = getLlmProvider();
  const result = await provider.complete(
    [
      {
        role: "system",
        content: buildSystemPrompt({ knowledge, role, path, signedIn: Boolean(userId) }),
      },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ],
    { maxTokens: 500 },
  );

  if (!result.ok) {
    return json(faqReply(message, role));
  }

  const parsed = parseModelJson(result.text);
  const reply = parsed?.reply || result.text.slice(0, 1200);
  let mode = parsed?.mode ?? "help";
  if (!parsed && /سیاست|فوتبال|اخبار/.test(message)) mode = "out_of_scope";
  const oosStreak = mode === "out_of_scope" ? oosStreakIn + 1 : 0;
  return json({
    reply,
    mode,
    oosStreak,
    locked: false,
    aiAvailable: true,
  });
}

async function handleBug(
  payload: unknown,
  userId: string | null,
  email: string | null,
  role: Role,
) {
  const rec = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const checked = validateBug({
    ...rec,
    role: rec.role || role,
  });
  if (!checked.ok) return json({ error: checked.error }, 400);
  const data = {
    ...checked.data,
    intent: redactSecrets(checked.data.intent),
    expected: redactSecrets(checked.data.expected),
    actual: redactSecrets(checked.data.actual),
    steps: checked.data.steps ? redactSecrets(checked.data.steps) : checked.data.steps,
    userAgent: checked.data.userAgent ? checked.data.userAgent.slice(0, 300) : checked.data.userAgent,
  };
  const sql = await getSql();
  const id = crypto.randomUUID();
  const conversationId =
    typeof data.conversationId === "string" && data.conversationId.trim()
      ? data.conversationId.trim().slice(0, 80)
      : null;
  await sql.query(
    `insert into bug_reports (
      id, user_id, reporter_email, conversation_id, role, page_url, route_path,
      intent, expected_result, actual_result, device, browser, user_agent, occurred_at,
      reproducible, steps, severity, status, app_version, attachment_url
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'new',$18,$19
    )`,
    [
      id,
      userId,
      email,
      conversationId,
      data.role,
      data.pageUrl,
      data.routePath ?? null,
      data.intent,
      data.expected,
      data.actual,
      data.device ?? null,
      data.browser ?? null,
      data.userAgent ?? null,
      data.occurredAt ?? new Date().toISOString(),
      data.reproducible ?? null,
      data.steps?.trim() || null,
      data.severity,
      data.appVersion ?? null,
      data.attachmentUrl ?? null,
    ],
  );
  const notified = await notifyBug({
    id,
    severity: data.severity,
    role: data.role,
    route: data.routePath,
    intent: data.intent,
    expected: data.expected,
    actual: data.actual,
    reporterEmail: email,
    userId,
    conversationId,
    attachmentUrl: data.attachmentUrl ?? null,
  });
  if (notified) {
    await sql.query("update bug_reports set notified_at = now() where id = $1", [id]);
  }
  return json({ ok: true, id, notified });
}

async function requireAdmin(userId: string | null) {
  if (!userId) throw new Error("لطفاً وارد شوید.");
  const sql = await getSql();
  const rows = await sql.query<{ is_admin: boolean }>("select is_admin from profiles where user_id = $1", [userId]);
  if (!rows[0]?.is_admin) throw new Error("دسترسی مدیریت ندارید.");
  return sql;
}

function mapBug(r: BugRow) {
  return {
    id: r.id,
    userId: r.user_id,
    reporterEmail: r.reporter_email,
    conversationId: r.conversation_id,
    role: r.role,
    pageUrl: r.page_url,
    routePath: r.route_path,
    intent: r.intent,
    expected: r.expected_result,
    actual: r.actual_result,
    device: r.device,
    browser: r.browser,
    steps: r.steps,
    severity: r.severity,
    status: r.status,
    reproducible: r.reproducible,
    appVersion: r.app_version,
    attachmentUrl: r.attachment_url,
    notifiedAt: r.notified_at,
    createdAt: r.created_at,
  };
}

async function handle(request: Request) {
  try {
    assertSameOrigin(request);
    const body = (await request.json().catch(() => null)) as { type?: unknown; payload?: unknown } | null;
    const type = typeof body?.type === "string" ? body.type : "";
    const payload = (body?.payload && typeof body.payload === "object" ? body.payload : {}) as Record<string, unknown>;
    const user = await sessionUser(request);
    const userId = user?.id ?? null;
    const email = user?.email ?? null;
    const role = await resolveRole(userId);
    const rateKey = clientKey(request, userId);

    if (type === "chat") {
      const limited = rateLimit(rateKey, "chat");
      if (!limited.ok) return json({ error: `کمی صبر کنید؛ حدود ${limited.retryMin} دقیقه دیگر.` }, 429);
      return handleChat(payload, userId, role, rateKey);
    }
    if (type === "bug") {
      const limited = rateLimit(rateKey, "bug");
      if (!limited.ok) return json({ error: `گزارش‌های زیادی آمد. حدود ${limited.retryMin} دقیقه دیگر.` }, 429);
      return handleBug(payload, userId, email, role);
    }
    if (type === "bugs") {
      const sql = await requireAdmin(userId);
      const rows = await sql.query<BugRow>(
        `select id, user_id, reporter_email, conversation_id, role, page_url, route_path, intent, expected_result, actual_result,
                device, browser, user_agent, occurred_at, reproducible, steps, severity, status, app_version,
                attachment_url, notified_at, created_at
         from bug_reports order by created_at desc limit 80`,
      );
      return json({ items: rows.map(mapBug) });
    }
    if (type === "bugStatus") {
      const sql = await requireAdmin(userId);
      const id = String(payload.id ?? "");
      const status = String(payload.status ?? "");
      if (!id || !["new", "reviewing", "resolved", "closed"].includes(status)) {
        return json({ error: "وضعیت نامعتبر است." }, 400);
      }
      await sql.query("update bug_reports set status = $2, updated_at = now() where id = $1", [id, status]);
      return json({ ok: true });
    }
    return json({ error: "نوع درخواست مشخص نیست." }, 400);
  } catch (err) {
    if (err instanceof ZodError) return json({ error: err.issues[0]?.message || "نامعتبر" }, 400);
    const message = err instanceof Error ? err.message : "انجام نشد.";
    const status = /Forbidden|دسترسی/.test(message) ? 403 : 400;
    return json({ error: message }, status);
  }
}

export const Route = createFileRoute("/api/guide")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
