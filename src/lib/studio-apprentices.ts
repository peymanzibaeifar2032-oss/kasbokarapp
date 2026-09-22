import { gregorianToJalali, JALALI_MONTHS, toFaDigits } from "./calendar/jalali.ts";

const TEHRAN_OFFSET_MS = 3.5 * 3600 * 1000;

/** Only a session marked present counts. Cancelled or missed lessons stay outside the 10. */
export function sessionCountDelta(fromStatus: string, toStatus: string) {
  const counted = (status: string) => (status === "present" ? 1 : 0);
  return counted(toStatus) - counted(fromStatus);
}

export const APPRENTICE_SESSION_GOAL = 10;
export const TEHRAN_THURSDAY = 4;

export type ApprenticeKind = "regular" | "substitute";
export type ApprenticeSlotStatus = "planned" | "present" | "absent" | "lunch";

export type ApprenticeSeed = {
  slug: string;
  name: string;
  phone: string;
  kind: ApprenticeKind;
  defaultSlotKey: string | null;
  sortOrder: number;
};

export type ApprenticeTemplateSlot = {
  slotKey: string;
  start: string;
  end: string;
  label: string;
  kind: "lesson" | "lunch";
  defaultSlug: string | null;
};

export const STUDIO_APPRENTICE_SEEDS: ApprenticeSeed[] = [
  { slug: "arman", name: "آرمان رستمی", phone: "09910476671", kind: "regular", defaultSlotKey: "s1012", sortOrder: 1 },
  { slug: "ava", name: "اوا خزلی", phone: "09185043846", kind: "regular", defaultSlotKey: "s1315", sortOrder: 2 },
  { slug: "hossein", name: "حسین مرادی", phone: "09187682329", kind: "regular", defaultSlotKey: "s1517", sortOrder: 3 },
  { slug: "fardin", name: "فردین بدری", phone: "09187223914", kind: "regular", defaultSlotKey: "s1719", sortOrder: 4 },
  { slug: "sina", name: "سینا مردان‌پور", phone: "09044709811", kind: "substitute", defaultSlotKey: null, sortOrder: 5 },
];

export const STUDIO_APPRENTICE_TEMPLATE: ApprenticeTemplateSlot[] = [
  { slotKey: "s1012", start: "10:00", end: "12:00", label: "۱۰ تا ۱۲", kind: "lesson", defaultSlug: "arman" },
  { slotKey: "lunch", start: "12:00", end: "13:00", label: "۱۲ تا ۱۳ · ناهار", kind: "lunch", defaultSlug: null },
  { slotKey: "s1315", start: "13:00", end: "15:00", label: "۱۳ تا ۱۵", kind: "lesson", defaultSlug: "ava" },
  { slotKey: "s1517", start: "15:00", end: "17:00", label: "۱۵ تا ۱۷", kind: "lesson", defaultSlug: "hossein" },
  { slotKey: "s1719", start: "17:00", end: "19:00", label: "۱۷ تا ۱۹", kind: "lesson", defaultSlug: "fardin" },
];

export type StudioApprentice = {
  id: string;
  slug: string;
  name: string;
  phone: string;
  kind: ApprenticeKind;
  defaultSlotKey: string | null;
  sortOrder: number;
  sessionGoal: number;
  sessionsDone: number;
};

export type StudioApprenticeSlot = {
  id: string;
  dayKey: string;
  slotKey: string;
  start: string;
  end: string;
  status: ApprenticeSlotStatus;
  apprenticeId: string | null;
  bookingId: string | null;
};

export type StudioApprenticeBoardSlot = StudioApprenticeSlot & {
  label: string;
  kind: "lesson" | "lunch";
  person: StudioApprentice | null;
};

export type StudioApprenticeBoard = {
  dayKey: string;
  label: string;
  thursdays: { dayKey: string; label: string }[];
  roster: StudioApprentice[];
  slots: StudioApprenticeBoardSlot[];
};

export function isTehranThursday(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map(Number);
  if (!y || !m || !d) return false;
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === TEHRAN_THURSDAY;
}

export function upcomingThursdays(from?: Date, count = 16) {
  const s = (from ?? new Date()).toLocaleString("sv-SE", { timeZone: "Asia/Tehran" });
  const [y, m, d] = (s.split(" ")[0] ?? "").split("-").map(Number);
  const start = Date.UTC(y, m - 1, d);
  const out: string[] = [];
  for (let i = 0; i < 400 && out.length < count; i++) {
    const ms = start + i * 86400000;
    const date = new Date(ms);
    if (date.getUTCDay() !== TEHRAN_THURSDAY) continue;
    const yy = date.getUTCFullYear();
    const mm = date.getUTCMonth() + 1;
    const dd = date.getUTCDate();
    out.push(`${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`);
  }
  return out;
}

export function thursdayBusyKeys(from = new Date(), weeks = 52) {
  return upcomingThursdays(from, weeks);
}

export function formatThursdayLabel(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const j = gregorianToJalali(y, m, d);
  return `پنجشنبه ${toFaDigits(j.jd)} ${JALALI_MONTHS[j.jm - 1]} ${toFaDigits(j.jy)}`;
}

export function apprenticeRemaining(sessionsDone: number, goal = APPRENTICE_SESSION_GOAL) {
  return Math.max(0, goal - Math.max(0, sessionsDone));
}

export function nextSessionNumber(sessionsDone: number, goal = APPRENTICE_SESSION_GOAL) {
  if (sessionsDone >= goal) return goal;
  return sessionsDone + 1;
}

export function slotTimesIso(dayKey: string, start: string, end: string) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return {
    startIso: new Date(Date.UTC(y, m - 1, d, sh, sm) - TEHRAN_OFFSET_MS).toISOString(),
    endIso: new Date(Date.UTC(y, m - 1, d, eh, em) - TEHRAN_OFFSET_MS).toISOString(),
  };
}

export function closeThursdayHours<T extends { day: string; open: string; close: string; closed?: boolean }>(hours: T[]): T[] {
  const next = hours.map((row) =>
    row.day === "پنجشنبه" ? { ...row, open: "", close: "", closed: true } : row,
  );
  if (!next.some((row) => row.day === "پنجشنبه")) {
    next.push({ day: "پنجشنبه", open: "", close: "", closed: true } as T);
  }
  return next;
}

export function isThursdayIso(iso: string) {
  const s = new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Tehran" });
  return isTehranThursday((s.split(" ")[0] ?? "").slice(0, 10));
}

export const THURSDAY_CUSTOMER_BLOCK_MESSAGE = "پنجشنبه‌ها مخصوص هنرجویان است. روز دیگری انتخاب کنید.";
