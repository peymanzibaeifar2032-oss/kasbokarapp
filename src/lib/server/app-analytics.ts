import { z } from "zod";
import { getSql } from "@/lib/db";
import { isStudioOwnerEmail, normalizeOwnerEmail } from "@/lib/studio-owner";
export { aggregateCashForMonth } from "@/lib/pocket/revenue-month";

type Sql = Awaited<ReturnType<typeof getSql>>;

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(120)
  .transform((v) => v.toLowerCase());

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function emailOf(sql: Sql, userId: string) {
  const rows = await sql.query<{ email: string }>(`select email from "user" where id = $1`, [userId]);
  return rows[0]?.email ?? "";
}

/** Owner stats: verified admin session AND Peyman owner email. */
export async function requireAppAnalyticsOwner(
  userId: string,
  requireAdmin: (id: string) => Promise<void>,
) {
  await requireAdmin(userId);
  const sql = await getSql();
  const email = await emailOf(sql, userId);
  if (!isStudioOwnerEmail(email)) {
    throw new Error("آمار اپلیکیشن فقط برای صاحب استودیو قابل مشاهده است.");
  }
  return { sql, email: normalizeOwnerEmail(email) };
}

export const installSchema = z.object({
  installId: z.string().trim().regex(/^[A-Za-z0-9_-]{16,80}$/),
  platform: z.enum(["android", "web"]).default("android"),
  appVersion: z.string().trim().regex(/^[0-9A-Za-z.+-]{1,40}$/).optional(),
});

/**
 * Register/refresh an install id. Install pings are SELF-REPORTED by the app (a client can invent ids),
 * so they are shown as such in the owner report. Account email is never taken from the payload:
 * it is bound only when the call comes from a verified session (userId), using that session's email.
 * Upsert on install_id keeps it idempotent; an anonymous ping can never overwrite a bound account.
 */
export async function performAppTelemetryInstall(userId: string | null, raw: unknown) {
  const data = installSchema.parse(raw);
  const sql = await getSql();
  const email = userId ? normalizeOwnerEmail(await emailOf(sql, userId)) || null : null;
  await sql.query(
    `insert into app_devices (install_id, account_email, user_id, platform, app_version, first_seen_at, last_seen_at)
     values ($1, $2, $3, $4, $5, now(), now())
     on conflict (install_id) do update set
       account_email = coalesce(excluded.account_email, app_devices.account_email),
       user_id = coalesce(excluded.user_id, app_devices.user_id),
       platform = excluded.platform,
       app_version = coalesce(excluded.app_version, app_devices.app_version),
       last_seen_at = now()`,
    [data.installId, email, userId, data.platform, data.appVersion ?? null],
  );
  return { ok: true as const };
}

/** Upsert Jalali-month cash totals for the signed-in account (real client totals, no synthesis). */
export async function performAppTelemetryRevenue(userId: string, raw: unknown) {
  const data = z
    .object({
      accountEmail: emailSchema,
      jy: z.number().int().min(1390).max(1500),
      jm: z.number().int().min(1).max(12),
      incomeToman: z.number().int().min(0).max(50_000_000_000),
      expenseToman: z.number().int().min(0).max(50_000_000_000),
    })
    .parse(raw);
  const sql = await getSql();
  const email = normalizeOwnerEmail(data.accountEmail);
  const sessionEmail = normalizeOwnerEmail(await emailOf(sql, userId));
  if (!sessionEmail || sessionEmail !== email) {
    throw new Error("ایمیل نشست با ایمیل گزارش هم‌خوان نیست.");
  }
  await sql.query(
    `insert into app_revenue_months (user_id, account_email, jy, jm, income_toman, expense_toman, updated_at)
     values ($1, $2, $3, $4, $5, $6, now())
     on conflict (account_email, jy, jm) do update set
       user_id = excluded.user_id,
       income_toman = excluded.income_toman,
       expense_toman = excluded.expense_toman,
       updated_at = now()`,
    [userId, email, data.jy, data.jm, data.incomeToman, data.expenseToman],
  );
  return { ok: true as const };
}

/** Server-observed: called only after the APK bytes were actually served. No client-supplied email. */
export async function recordAppDownloadEvent(input: { fileName: string; installId?: string | null; userId?: string | null }) {
  const sql = await getSql();
  const email = null;
  await sql.query(
    `insert into app_download_events (id, file_name, install_id, user_id, account_email, downloaded_at)
     values ($1, $2, $3, $4, $5, now())`,
    [newId("dl"), input.fileName, input.installId ?? null, input.userId ?? null, email],
  );
}

export async function performAppAnalyticsReport(
  userId: string,
  requireAdmin: (id: string) => Promise<void>,
) {
  const { sql } = await requireAppAnalyticsOwner(userId, requireAdmin);

  const installs = await sql.query<{ c: string }>(`select count(*)::text as c from app_devices`);
  const downloads = await sql.query<{ c: string }>(
    `select count(*)::text as c from app_download_events where file_name = 'taghvim-nobat.apk'`,
  );
  const accounts = await sql.query<{ email: string; devices: string; last_seen: string }>(
    `select lower(account_email) as email,
            count(*)::text as devices,
            max(last_seen_at)::text as last_seen
       from app_devices
      where account_email is not null and account_email <> ''
      group by lower(account_email)
      order by max(last_seen_at) desc
      limit 500`,
  );
  const months = await sql.query<{
    account_email: string;
    jy: number;
    jm: number;
    income_toman: string;
    expense_toman: string;
  }>(
    `select account_email, jy, jm, income_toman::text, expense_toman::text
       from app_revenue_months
      order by jy desc, jm desc, account_email
      limit 1200`,
  );

  return {
    // Provenance: downloads = server-observed (APK served by this server, rate-limited per IP; mirror
    // downloads e.g. Netlify are NOT counted). installs/accounts = self-reported by the app.
    // monthlyRevenue = self-reported cash-box totals from each signed-in account, not verified income.
    provenance: { downloads: "server-observed", installs: "self-reported", monthlyRevenue: "self-reported" } as const,
    installs: Number(installs[0]?.c || 0),
    downloads: Number(downloads[0]?.c || 0),
    accounts: accounts.map((row) => ({
      email: row.email,
      devices: Number(row.devices || 0),
      lastSeenAt: row.last_seen,
    })),
    monthlyRevenue: months.map((row) => ({
      email: row.account_email,
      jy: row.jy,
      jm: row.jm,
      incomeToman: Number(row.income_toman || 0),
      expenseToman: Number(row.expense_toman || 0),
    })),
  };
}

