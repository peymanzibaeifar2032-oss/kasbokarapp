import type { Business, PriceItem, WorkHour } from "@/lib/types";

export const WEEKDAYS_FA = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"] as const;

/** Iran has no DST; wall-clock is UTC+03:30. */
const TEHRAN_OFFSET_MS = 3.5 * 3600 * 1000;

export type TehranClock = {
  y: number;
  m: number;
  day: number;
  hh: number;
  mm: number;
  weekday: number;
};

export function tehranClock(date = new Date()): TehranClock {
  const s = date.toLocaleString("sv-SE", { timeZone: "Asia/Tehran" });
  const [ymd, hms] = s.split(" ");
  const [y, m, day] = (ymd ?? "").split("-").map(Number);
  const [hh, mm] = (hms ?? "00:00").split(":").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
  return { y, m, day, hh, mm, weekday };
}

export function tehranLocalToIso(y: number, m: number, day: number, hh: number, mm: number) {
  return new Date(Date.UTC(y, m - 1, day, hh, mm) - TEHRAN_OFFSET_MS).toISOString();
}

export function tehranDayKey(date = new Date()) {
  const clock = tehranClock(date);
  return `${clock.y}-${String(clock.m).padStart(2, "0")}-${String(clock.day).padStart(2, "0")}`;
}

/** Inclusive civil-day start (00:00) through exclusive next-day start, Tehran. */
export function tehranDayBounds(date = new Date(), days = 1) {
  const clock = tehranClock(date);
  const start = tehranLocalToIso(clock.y, clock.m, clock.day, 0, 0);
  const endDate = new Date(Date.UTC(clock.y, clock.m - 1, clock.day + Math.max(1, days)));
  const end = tehranLocalToIso(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, endDate.getUTCDate(), 0, 0);
  return { start, end };
}

function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  if (h === 0 && m === 0) return 24 * 60;
  return (h || 0) * 60 + (m || 0);
}

export function hoursForDay(hours: WorkHour[], weekday: number) {
  const name = WEEKDAYS_FA[weekday];
  return hours.find((h) => h.day === name);
}

export function isOpenNow(hours: WorkHour[], date = new Date()) {
  const clock = tehranClock(date);
  const row = hoursForDay(hours, clock.weekday);
  if (!row || row.closed || !row.open || !row.close) return false;
  const now = clock.hh * 60 + clock.mm;
  const open = minutesOf(row.open);
  let close = minutesOf(row.close);
  if (close <= open) close += 24 * 60;
  return now >= open && now < close;
}

export function todayHoursLabel(hours: WorkHour[], date = new Date()) {
  const clock = tehranClock(date);
  const row = hoursForDay(hours, clock.weekday);
  if (!row || row.closed || !row.open) return "امروز تعطیل";
  const close = row.close === "00:00" ? "۲۴:۰۰" : row.close;
  if (isOpenNow(hours, date)) return `الان باز است · تا ${close}`;
  const now = clock.hh * 60 + clock.mm;
  const open = minutesOf(row.open);
  if (now < open) return `امروز از ${row.open} باز می‌شود`;
  return `امروز ${row.open} تا ${close}`;
}

export type BusyInterval = { start: string; end: string };
export type BusyInput = string | BusyInterval;

export type SlotOption = { iso: string; endIso: string; label: string; dayKey: string; dayLabel: string };

/** Half-open [start, end). */
export function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export function serviceDurationMinutes(
  prices: PriceItem[] | undefined,
  serviceTitle: string | null | undefined,
  slotMinutes: number,
): { minutes: number; known: boolean } {
  const fallback = Math.max(10, slotMinutes || 60);
  if (!serviceTitle) return { minutes: fallback, known: false };
  const item = (prices ?? []).find((p) => p.title === serviceTitle);
  if (item && typeof item.minutes === "number" && Number.isFinite(item.minutes) && item.minutes >= 10) {
    return { minutes: Math.max(10, Math.min(4320, Math.round(item.minutes))), known: true };
  }
  return { minutes: fallback, known: false };
}

function toBusyRanges(busy: BusyInput[], fallbackDurationMs: number): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  for (const item of busy) {
    if (typeof item === "string") {
      const start = new Date(item).getTime();
      if (!Number.isFinite(start)) continue;
      out.push({ start, end: start + fallbackDurationMs });
      continue;
    }
    const start = new Date(item.start).getTime();
    const end = new Date(item.end).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    out.push({ start, end });
  }
  return out;
}

function conflicts(start: number, end: number, ranges: { start: number; end: number }[]) {
  return ranges.some((r) => intervalsOverlap(start, end, r.start, r.end));
}

export function buildSlots(
  business: Pick<Business, "workHours" | "slotMinutes">,
  busy: BusyInput[] = [],
  days = 7,
  now: Date = new Date(),
  durationMinutes?: number,
) {
  const duration = Math.max(10, durationMinutes ?? (business.slotMinutes || 60));
  const durationMs = duration * 60000;
  const ranges = toBusyRanges(busy, durationMs);
  const out: SlotOption[] = [];
  const clock = tehranClock(now);
  const map = new Map(business.workHours.map((h) => [h.day, h]));
  const longJob = duration >= 12 * 60;
  const daySpan = longJob ? Math.max(1, Math.round(duration / (24 * 60))) : 1;
  const windowDays = longJob ? Math.max(days, daySpan * 5) : days;
  const minStart = now.getTime() + 20 * 60000;

  for (let i = 0; i < windowDays; i++) {
    const base = new Date(Date.UTC(clock.y, clock.m - 1, clock.day + i));
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth() + 1;
    const day = base.getUTCDate();
    const weekday = base.getUTCDay();
    const name = WEEKDAYS_FA[weekday];
    const hours = map.get(name);
    if (!hours || hours.closed || !hours.open || !hours.close) continue;
    const openM = minutesOf(hours.open);
    let closeM = minutesOf(hours.close);
    if (closeM <= openM) closeM += 24 * 60;
    const dayKey = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayLabel = `${name} · ${y}/${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}`;

    if (longJob) {
      if (i % daySpan !== 0) continue;
      const hh = Math.floor((openM % (24 * 60)) / 60);
      const mm = openM % 60;
      const iso = tehranLocalToIso(y, m, day, hh, mm);
      const ms = new Date(iso).getTime();
      if (ms < minStart) continue;
      const endMs = ms + durationMs;
      if (conflicts(ms, endMs, ranges)) continue;
      out.push({
        iso,
        endIso: new Date(endMs).toISOString(),
        label: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
        dayKey,
        dayLabel,
      });
      continue;
    }

    for (let t = openM; t + duration <= closeM; t += duration) {
      const hh = Math.floor((t % (24 * 60)) / 60);
      const mm = t % 60;
      const iso = tehranLocalToIso(y, m, day, hh, mm);
      const ms = new Date(iso).getTime();
      if (ms < minStart) continue;
      const endMs = ms + durationMs;
      if (conflicts(ms, endMs, ranges)) continue;
      out.push({
        iso,
        endIso: new Date(endMs).toISOString(),
        label: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
        dayKey,
        dayLabel,
      });
    }
  }
  return out;
}

export function hasFreeToday(
  business: Pick<Business, "workHours" | "slotMinutes">,
  busy: BusyInput[] = [],
  now: Date = new Date(),
  durationMinutes?: number,
) {
  const key = tehranDayKey(now);
  return buildSlots(business, busy, 1, now, durationMinutes).some((s) => s.dayKey === key);
}

/** @deprecated Use hasFreeToday with real occupancy. Kept as a thin wrapper. */
export function hasSlotToday(business: Pick<Business, "workHours" | "slotMinutes">, busy: BusyInput[] = []) {
  return hasFreeToday(business, busy);
}

export function nextAvailable(
  business: Pick<Business, "workHours" | "slotMinutes">,
  busy: BusyInput[] = [],
  now: Date = new Date(),
  durationMinutes?: number,
) {
  return buildSlots(business, busy, 10, now, durationMinutes)[0] ?? null;
}

export { profileCompleteness } from "./search/completeness.ts";
