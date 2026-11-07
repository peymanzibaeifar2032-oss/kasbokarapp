import { readReferralState, referralStateSchema, writeReferralState, type PocketReferralState } from "./referral-club.ts";
import { assertCanMutate } from "./license-gate.ts";
import { z } from "zod";
import { jalaliMonthLength } from "../calendar/jalali.ts";
import { openPocketDb, type PocketBooking } from "../pocket-book.ts";
import {
  listTrainees,
  listTraineePayments,
  type Trainee,
  type TraineePayment,
} from "./trainees.ts";
import type { PocketSettings } from "./settings.ts";
import { listCashEntries, saveCashEntries, type CashEntry } from "./cash-box.ts";

export const MAX_BACKUP_BYTES = 24 * 1024 * 1024;
const text = z.string().max(4000);
const id = z
  .string()
  .min(1)
  .max(120)
  .refine((s) => !["__proto__", "constructor", "prototype"].includes(s));
const date = z
  .string()
  .regex(/^1[34]\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  .refine((s) => {
    const [y, m, d] = s.split("-").map(Number);
    return d <= jalaliMonthLength(y, m);
  });
const amount = z.number().finite().min(0).max(2_000_000_000_000);
const photo = z
  .string()
  .max(1024 * 1024)
  .refine(
    (s) => !s || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s),
    "عکس باید داده تصویری امن باشد",
  );
const field = z.object({
  id,
  storeAs: z.enum([
    "name",
    "phone",
    "style",
    "placement",
    "time",
    "sizeCm",
    "priceToman",
    "photo",
    "note",
    "details",
  ]),
  labelFa: z.string().max(120),
  labelEn: z.string().max(120),
  placeholderFa: z.string().max(200),
  placeholderEn: z.string().max(200),
  kind: z.enum(["text", "tel", "time", "numeric", "file", "textarea"]),
  required: z.boolean().optional(),
});
const shortText = z.string().max(200).default("");
const money = z.number().int().finite().min(0).max(2_000_000_000).default(0);
/** Strict schema for read-only site facts (server export + JSON backup). Unknown keys are stripped. */
export const serverDetailsSchema = z.object({
  phone2: z.string().max(40).default(""),
  instagram: z.string().max(80).default(""),
  sizeCm: shortText,
  requestType: z.enum(["", "new", "coverup", "consultation", "custom", "repair", "continuation"]).catch(""),
  idea: z.string().max(2000).default(""),
  priceMinToman: money,
  priceMaxToman: money,
  depositToman: money,
  paidToman: money,
  sessionCount: z.number().int().min(0).max(1000).default(0),
  sessionMinutes: z.number().int().min(0).max(100000).default(0),
  bookingId: z.union([z.literal(""), id]).default(""),
  slotStart: z
    .string()
    .max(40)
    .refine((s) => !s || !Number.isNaN(Date.parse(s)))
    .default(""),
});
const booking = z.object({
  id,
  day: date,
  name: z.string().trim().min(1).max(200),
  phone: z.string().max(80).default(""),
  style: text.default(""),
  placement: text.default(""),
  time: z
    .string()
    .regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/)
    .default(""),
  note: text.default(""),
  priceToman: amount.optional(),
  sizeCm: z.string().max(200).optional(),
  photo: photo.optional(),
  serverId: id.nullable().default(null),
  pinned: z.boolean().default(true),
  professionId: id.optional(),
  server: serverDetailsSchema.optional(),
  details: z
    .record(id, text)
    .refine((v) => Object.keys(v).length <= 80)
    .optional(),
  fieldSchema: z.array(field).max(80).optional(),
  customFields: z
    .array(
      z.object({
        id,
        label: z.string().trim().min(1).max(120),
        value: text,
        kind: z.literal("text").default("text"),
      }),
    )
    .max(40)
    .optional(),
});
const trainee = z.object({
  id,
  name: z.string().trim().min(1).max(200),
  phone: z.string().max(80).default(""),
  honorific: z.string().max(80).default(""),
  sessionGoal: z.number().int().min(1).max(10000).default(12),
  sessionsDone: z.number().int().min(0).max(10000).default(0),
  feeTotalToman: amount.default(0),
  paidToman: amount.default(0),
  notes: text.default(""),
  startedOn: z.union([date, z.literal("")]).default(""),
  createdAt: z.string().max(80).default(""),
  serverId: id.optional(),
  debtToman: amount.optional(),
});
const payment = z.object({
  id,
  traineeId: id,
  amountToman: amount,
  paidOn: date,
  note: text.default(""),
});
const cashEntry = z.object({
  id,
  day: date,
  kind: z.enum(["income", "expense"]),
  title: z.string().max(400).default(""),
  amountToman: amount,
  note: text.default(""),
  createdAt: z.string().max(80).default(""),
  serverId: z.string().max(120).optional(),
  source: z.literal("server").optional(),
  category: z.string().max(400).optional(),
  ref: z.string().max(2000).optional(),
  bookingId: z.string().max(200).optional(),
  bookingServerId: z.string().max(200).optional(),
});
const settingsSchema = z.object({
  locale: z.enum(["fa", "en"]),
  professionId: id,
  onboarded: z.boolean(),
});
export type PocketBackup = {
  format: "kasbokar-pocket";
  /** 3 adds cashEntries. 1/2 files (no cash) still import; their cash box is left untouched. */
  schemaVersion: 3;
  /** undefined = file carries no cash section (old file); [] = file says the cash box is empty. */
  cashEntries?: CashEntry[];
  exportedAt: string;
  bookings: PocketBooking[];
  trainees: Trainee[];
  traineePayments: TraineePayment[];
  settings?: PocketSettings;
  /** 1.15.2: cached referral club + phone-only club SMS text edits. undefined = old file, leave as is. */
  referral?: PocketReferralState;
};
const unique = (rows: { id: string }[], name: string) => {
  if (new Set(rows.map((r) => r.id)).size !== rows.length)
    throw new Error(`شناسه تکراری در ${name}`);
};
export function parsePocketBackup(input: string | unknown): PocketBackup {
  if (typeof input === "string" && new TextEncoder().encode(input).length > MAX_BACKUP_BYTES)
    throw new Error("حجم فایل بیش از ۲۴ مگابایت است.");
  const parsed: unknown =
    typeof input === "string" ? JSON.parse(input.replace(/^\uFEFF/, "")) : input;
  const raw: Record<string, unknown> = Array.isArray(parsed)
    ? { bookings: parsed }
    : parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  if (raw.schemaVersion !== undefined && raw.schemaVersion !== 1 && raw.schemaVersion !== 2 && raw.schemaVersion !== 3)
    throw new Error("نسخه فایل پشتیبانی نمی‌شود.");
  if (raw.format !== undefined && raw.format !== "kasbokar-pocket")
    throw new Error("نوع فایل پشتیبانی نمی‌شود.");
  const bookings = z
    .array(booking)
    .max(10000)
    .parse(raw.bookings ?? raw.rows);
  const trainees = z
    .array(trainee)
    .max(10000)
    .parse(raw.trainees ?? []);
  const traineePayments = z
    .array(payment)
    .max(20000)
    .parse(raw.traineePayments ?? []);
  const cashEntries =
    raw.cashEntries === undefined ? undefined : (z.array(cashEntry).max(50000).parse(raw.cashEntries) as CashEntry[]);
  if (cashEntries) unique(cashEntries, "صندوق");
  for (const row of bookings) {
    if (row.customFields) unique(row.customFields, "کادرهای سفارشی");
    if (row.fieldSchema) unique(row.fieldSchema, "فیلدهای شغل");
  }
  unique(bookings, "نوبت‌ها");
  unique(trainees, "هنرجوها");
  unique(traineePayments, "واریزی‌ها");
  const serverIds = bookings.filter((b) => b.serverId).map((b) => b.serverId);
  if (new Set(serverIds).size !== serverIds.length) throw new Error("شناسه سرور تکراری است.");
  const people = new Set(trainees.map((t) => t.id));
  if (traineePayments.some((p) => !people.has(p.traineeId)))
    throw new Error("واریزی به هنرجوی ناموجود اشاره می‌کند.");
  return {
    format: "kasbokar-pocket",
    schemaVersion: 3,
    cashEntries,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt.slice(0, 80) : "",
    bookings,
    trainees,
    traineePayments,
    settings: raw.settings ? settingsSchema.parse(raw.settings) : undefined,
    referral: raw.referral === undefined || raw.referral === null ? undefined : referralStateSchema.parse(raw.referral),
  };
}
/** Merge defaults to preserving local conflicts. Explicit replace overwrites matches, never deletes unmentioned rows. */
export function mergeById<T extends { id: string }>(
  local: T[],
  incoming: T[],
  replace = false,
): T[] {
  const map = new Map(local.map((r) => [r.id, r]));
  for (const row of incoming) if (replace || !map.has(row.id)) map.set(row.id, row);
  return [...map.values()];
}
export function mergeBackup(
  local: PocketBackup,
  incoming: PocketBackup,
  replace = false,
): PocketBackup {
  const linked = new Map(local.bookings.filter((b) => b.serverId).map((b) => [b.serverId, b.id]));
  const bookings = incoming.bookings.map((b) => ({
    ...b,
    id: (b.serverId && linked.get(b.serverId)) || b.id,
  }));
  return {
    ...local,
    bookings: mergeById(local.bookings, bookings, replace),
    trainees: mergeById(local.trainees, incoming.trainees, replace),
    traineePayments: mergeById(local.traineePayments, incoming.traineePayments, replace),
    cashEntries:
      incoming.cashEntries === undefined
        ? local.cashEntries
        : mergeById(local.cashEntries ?? [], incoming.cashEntries, replace),
    // Club snapshot: a file's club only fills an empty phone (or replaces it on explicit replace); phone text edits win unless replace.
    referral:
      incoming.referral === undefined
        ? local.referral
        : {
            club: replace || !local.referral?.club ? incoming.referral.club ?? local.referral?.club ?? null : local.referral.club,
            localSettings: replace || !local.referral?.localSettings ? incoming.referral.localSettings ?? local.referral?.localSettings ?? null : local.referral.localSettings,
          },
  };
}
export async function currentBackup(
  bookings: PocketBooking[],
  settings: PocketSettings,
): Promise<PocketBackup> {
  const [trainees, traineePayments, cashEntries] = await Promise.all([
    listTrainees(),
    listTraineePayments(),
    listCashEntries(),
  ]);
  return {
    format: "kasbokar-pocket",
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    bookings,
    trainees,
    traineePayments,
    cashEntries,
    settings,
    referral: readReferralState(),
  };
}
/** Backup + all 3 stores in one IDB transaction. Quota/error abort leaves ALL old stores intact. */
export async function commitBackup(next: PocketBackup, previous: PocketBackup) {
  assertCanMutate();
  const db = await openPocketDb();
  try {
    const tx = db.transaction(["bookings", "people", "payments", "metadata"], "readwrite");
    const done = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("ذخیره لغو شد"));
    });
    try {
      tx.objectStore("metadata").put({ id: "before-last-import", snapshot: previous });
      for (const [store, rows] of [
        ["bookings", next.bookings],
        ["people", next.trainees],
        ["payments", next.traineePayments],
      ] as const) {
        const target = tx.objectStore(store);
        target.clear();
        for (const row of rows) target.put(row);
      }
    } catch (error) {
      tx.abort();
      await done.catch(() => undefined);
      throw error;
    }
    await done;
  } finally {
    db.close();
  }
  if (next.cashEntries !== undefined && next.cashEntries !== previous.cashEntries) {
    try {
      await saveCashEntries(next.cashEntries);
    } catch (error) {
      // Cash lives in its own database: roll the appointment/trainee stores back so the import stays all-or-nothing.
      await commitBackup({ ...previous, cashEntries: undefined }, previous).catch(() => undefined);
      throw error;
    }
  }
  if (next.referral !== undefined && next.referral !== previous.referral) {
    try {
      writeReferralState(next.referral);
    } catch (error) {
      if (next.cashEntries !== undefined && previous.cashEntries !== undefined) await saveCashEntries(previous.cashEntries).catch(() => undefined);
      await commitBackup({ ...previous, cashEntries: undefined, referral: undefined }, previous).catch(() => undefined);
      throw error;
    }
  }
}
export async function readImportRecovery(): Promise<PocketBackup | undefined> {
  const db = await openPocketDb();
  try {
    return await new Promise((resolve, reject) => {
      const r = db.transaction("metadata").objectStore("metadata").get("before-last-import");
      r.onsuccess = () => resolve(r.result?.snapshot);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
