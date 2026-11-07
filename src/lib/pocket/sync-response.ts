import { z } from "zod";
import { parsePocketBackup, serverDetailsSchema } from "./backup.ts";
import type { PocketIncoming } from "../pocket-book.ts";

export class PocketSyncError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Refuse malformed snapshots: treating an error/HTML as [] would erase downloaded items. */
export function parsePocketExport(status: number, data: unknown): PocketIncoming[] {
  if (status === 401)
    throw new PocketSyncError(
      status,
      "برای دانلود نوبت‌ها، ابتدا با حساب سایت خود وارد شوید. ایمیل آفلاین به‌تنهایی ورود نیست.",
    );
  if (status === 403)
    throw new PocketSyncError(
      status,
      "این حساب اجازهٔ دریافت نوبت‌های استودیو را ندارد. با حساب صاحب استودیو وارد شوید.",
    );
  if (status === 404 || status === 410)
    throw new PocketSyncError(
      status,
      "مسیر دانلود روی سرور سایت در دسترس نیست؛ انتشار سرور باید بررسی شود.",
    );
  if (status === 0)
    throw new PocketSyncError(
      status,
      "اتصال امن به kasbokarapp.com برقرار نشد یا پاسخ سرور معتبر نبود. اینترنت را بررسی و دوباره تلاش کنید.",
    );
  if (status < 200 || status >= 300) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `خطای سرور (${status})`;
    throw new PocketSyncError(status, message);
  }
  if (!data || typeof data !== "object" || !("bookings" in data) || !Array.isArray(data.bookings)) {
    throw new PocketSyncError(
      status,
      "ساختار پاسخ دانلود نوبت‌ها معتبر نیست؛ دادهٔ گوشی تغییر نکرد.",
    );
  }
  const keys = ["serverId", "day", "time", "name", "phone", "style", "placement"] as const;
  const ids = new Set<string>();
  return data.bookings.map((row: unknown) => {
    if (
      !row ||
      typeof row !== "object" ||
      !keys.every((key) => key in row && typeof (row as Record<string, unknown>)[key] === "string")
    ) {
      throw new PocketSyncError(status, "یک نوبت در پاسخ سرور ناقص است؛ دادهٔ گوشی تغییر نکرد.");
    }
    const item = row as PocketIncoming;
    if (
      !item.serverId ||
      ids.has(item.serverId) ||
      !/^1[34]\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(item.day) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)
    ) {
      throw new PocketSyncError(
        status,
        "شناسه یا تاریخ یک نوبت معتبر نیست؛ دادهٔ گوشی تغییر نکرد.",
      );
    }
    ids.add(item.serverId);
    const base = Object.fromEntries(keys.map((key) => [key, item[key]])) as unknown as PocketIncoming;
    const raw = row as Record<string, unknown>;
    if (SERVER_DETAIL_KEYS.some((key) => key in raw)) {
      // A bad optional detail must not discard the whole sync: fall back field-by-field to defaults.
      const parsed = serverDetailsSchema.safeParse(raw);
      base.server = parsed.success ? parsed.data : tolerantServerDetails(raw);
    }
    return base;
  });
}

function tolerantServerDetails(raw: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  const shape = serverDetailsSchema.shape;
  for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
    const one = shape[key].safeParse(raw[key]);
    out[key] = one.success ? one.data : shape[key].parse(undefined);
  }
  return out as z.infer<typeof serverDetailsSchema>;
}

const SERVER_DETAIL_KEYS = ["phone2", "instagram", "sizeCm", "priceMinToman", "paidToman", "bookingId", "slotStart"];

const jalaliDay = z.string().regex(/^1[34]\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
const toman = z.number().int().finite().min(0).max(2_000_000_000_000);
const signedToman = z.number().int().finite().min(-2_000_000_000_000).max(2_000_000_000_000);

export const financeRecordSchema = z.object({
  serverId: z.string().regex(/^(pay|exp):[A-Za-z0-9_.:-]{1,100}$/),
  kind: z.enum(["income", "expense"]),
  day: jalaliDay,
  amountToman: z.number().int().min(1).max(2_000_000_000),
  title: z.string().trim().max(200).transform((v) => v || "بدون عنوان"),
  note: z.string().max(4000).transform((v) => v.slice(0, 500)).default(""),
  category: z.string().max(400).transform((v) => v.slice(0, 80)).default(""),
  ref: z.string().max(2000).transform((v) => v.slice(0, 300)).default(""),
});

export const serverFinanceSchema = z.object({
  status: z.literal("ok"),
  generatedAt: z.string().max(40).refine((s) => !Number.isNaN(Date.parse(s))),
  truncated: z.boolean().default(false),
  records: z
    .array(financeRecordSchema)
    .max(10000)
    .refine((rows) => new Set(rows.map((row) => row.serverId)).size === rows.length, "duplicate"),
  summary: z.object({
    incomeToman: toman,
    expenseToman: toman,
    balanceToman: signedToman,
    openReceivableToman: toman,
  }),
  currentMonth: z.object({
    jy: z.number().int().min(1300).max(1600),
    jm: z.number().int().min(1).max(12),
    paid: toman,
    remainingMonth: toman,
    remainingAll: toman,
    salonCost: toman,
    lifeCost: toman,
    expenseTotal: toman,
    salonProfit: signedToman,
    leftover: signedToman,
  }),
});
export type PocketServerFinance = z.infer<typeof serverFinanceSchema>;

const accountSchema = z.object({
  isOwner: z.boolean(),
  canViewAppStats: z.boolean(),
  accountEmail: z.string().max(200),
});
export type PocketServerAccount = z.infer<typeof accountSchema>;

export const appStatsSchema = z.object({
  installs: z.number().finite().min(0),
  downloads: z.number().finite().min(0),
  accounts: z
    .array(z.object({ email: z.string().max(200), devices: z.number().finite(), lastSeenAt: z.string().max(60) }))
    .max(20000),
  monthlyRevenue: z
    .array(
      z.object({
        email: z.string().max(200),
        jy: z.number().int(),
        jm: z.number().int(),
        incomeToman: z.number().finite(),
        expenseToman: z.number().finite(),
      }),
    )
    .max(50000),
});
export type PocketAppStats = z.infer<typeof appStatsSchema>;

export type PocketFinanceResult =
  | { state: "ok"; data: PocketServerFinance; skipped: number }
  | { state: "error"; message: string }
  | { state: "unavailable" }
  | { state: "invalid" };

/** Old production exports contain bookings only; missing trainees/finance is NOT an empty roster/ledger. */
export function parsePocketSnapshot(status: number, data: unknown) {
  const bookings = parsePocketExport(status, data);
  const raw = data as Record<string, unknown>;
  // Role flags are accepted only from a successful, session-authenticated export of the fixed endpoint,
  // are never persisted, and default to "not owner" whenever anything is missing or malformed.
  const accountParsed = accountSchema.safeParse(raw.account);
  const account: PocketServerAccount | null = accountParsed.success ? accountParsed.data : null;
  const finance = parseFinance(raw);
  let appStats: PocketAppStats | null = null;
  if (account?.isOwner && account.canViewAppStats && raw.appStats) {
    const parsed = appStatsSchema.safeParse(raw.appStats);
    appStats = parsed.success ? parsed.data : null;
  }
  if (!("trainees" in raw)) return { bookings, training: undefined, trainingSkipped: 0, account, finance, appStats };
  const training = parseTraining(raw.trainees, raw.traineePayments);
  return {
    bookings,
    training: { trainees: training.trainees, traineePayments: training.traineePayments },
    trainingSkipped: training.skipped,
    account,
    finance,
    appStats,
  };
}

/** Role probe result. Any failure (401, offline, malformed) means: hide every owner-only surface. */
export function parsePocketAccess(status: number, data: unknown): { account: PocketServerAccount | null; appStats: PocketAppStats | null } {
  if (status < 200 || status >= 300 || !data || typeof data !== "object") return { account: null, appStats: null };
  const raw = data as Record<string, unknown>;
  const parsed = accountSchema.safeParse(raw.account);
  if (!parsed.success) return { account: null, appStats: null };
  const account = parsed.data;
  if (!account.isOwner) return { account: { ...account, canViewAppStats: false }, appStats: null };
  const stats = account.canViewAppStats ? appStatsSchema.safeParse(raw.appStats) : null;
  return { account, appStats: stats?.success ? stats.data : null };
}

/**
 * Finance is parsed independently of bookings/trainees. Envelope (summary + month) must be valid; each
 * ledger row is validated on its own so one odd row cannot hide the whole cash box. Skipped rows are counted.
 * "unavailable" = the server sent no finance key (old server), "error" = server said it failed,
 * "invalid" = envelope malformed. None of these is ever treated as a real zero.
 */
export function parseFinance(raw: Record<string, unknown>): PocketFinanceResult {
  if (typeof raw.financeError === "string" && (raw.finance === null || raw.finance === undefined))
    return { state: "error", message: raw.financeError.slice(0, 300) };
  if (!("finance" in raw) || raw.finance === null || raw.finance === undefined) return { state: "unavailable" };
  const f = raw.finance as Record<string, unknown>;
  if (!f || typeof f !== "object" || !Array.isArray(f.records)) return { state: "invalid" };
  const seen = new Set<string>();
  const records: z.infer<typeof financeRecordSchema>[] = [];
  let skipped = 0;
  for (const row of f.records) {
    const one = financeRecordSchema.safeParse(row);
    if (!one.success || seen.has(one.data.serverId)) {
      skipped += 1;
      continue;
    }
    seen.add(one.data.serverId);
    records.push(one.data);
  }
  const parsed = serverFinanceSchema.safeParse({ ...f, records: [] });
  if (!parsed.success) return { state: "invalid" };
  return { state: "ok", data: { ...parsed.data, records, truncated: parsed.data.truncated || skipped > 0 }, skipped };
}

/** Per-row trainee import: invalid rows are skipped (and counted), never a whole-sync failure. */
export function parseTraining(rawTrainees: unknown, rawPayments: unknown) {
  const trainees: ReturnType<typeof parsePocketBackup>["trainees"] = [];
  const traineePayments: ReturnType<typeof parsePocketBackup>["traineePayments"] = [];
  let skipped = 0;
  const ids = new Set<string>();
  for (const row of Array.isArray(rawTrainees) ? rawTrainees : []) {
    const fixed =
      row && typeof row === "object"
        ? { ...(row as Record<string, unknown>), sessionGoal: Math.max(1, Number((row as Record<string, unknown>).sessionGoal) || 1) }
        : row;
    try {
      const t = parsePocketBackup({ bookings: [], trainees: [fixed] }).trainees[0];
      if (ids.has(t.id)) throw new Error("dup");
      ids.add(t.id);
      trainees.push(t);
    } catch {
      skipped += 1;
    }
  }
  const payIds = new Set<string>();
  for (const row of Array.isArray(rawPayments) ? rawPayments : []) {
    const traineeId = row && typeof row === "object" ? String((row as Record<string, unknown>).traineeId) : "";
    if (!ids.has(traineeId)) {
      skipped += 1;
      continue;
    }
    try {
      const p = parsePocketBackup({ bookings: [], trainees: trainees.filter((t) => t.id === traineeId), traineePayments: [row] }).traineePayments[0];
      if (payIds.has(p.id)) throw new Error("dup");
      payIds.add(p.id);
      traineePayments.push(p);
    } catch {
      skipped += 1;
    }
  }
  return { trainees, traineePayments, skipped };
}
