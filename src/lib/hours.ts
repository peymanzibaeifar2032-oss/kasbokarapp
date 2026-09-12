import type { Business, WorkHour } from "@/lib/types";

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

export type SlotOption = { iso: string; label: string; dayKey: string; dayLabel: string };

export function buildSlots(business: Pick<Business, "workHours" | "slotMinutes">, busyIso: string[] = [], days = 7) {
  const duration = Math.max(10, business.slotMinutes || 60);
  const busy = new Set(busyIso.map((s) => new Date(s).getTime()));
  const out: SlotOption[] = [];
  const clock = tehranClock();
  const map = new Map(business.workHours.map((h) => [h.day, h]));
  const longJob = duration >= 12 * 60;
  const daySpan = longJob ? Math.max(1, Math.round(duration / (24 * 60))) : 1;
  const windowDays = longJob ? Math.max(days, daySpan * 5) : days;

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
      if (ms < Date.now() + 20 * 60000) continue;
      if (busy.has(ms)) continue;
      out.push({ iso, label: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, dayKey, dayLabel });
      continue;
    }

    for (let t = openM; t + duration <= closeM; t += duration) {
      const hh = Math.floor((t % (24 * 60)) / 60);
      const mm = t % 60;
      const iso = tehranLocalToIso(y, m, day, hh, mm);
      const ms = new Date(iso).getTime();
      if (ms < Date.now() + 20 * 60000) continue;
      if (busy.has(ms)) continue;
      out.push({
        iso,
        label: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
        dayKey,
        dayLabel,
      });
    }
  }
  return out;
}

export function hasSlotToday(business: Pick<Business, "workHours" | "slotMinutes">, busyIso: string[] = []) {
  const clock = tehranClock();
  const key = `${clock.y}-${String(clock.m).padStart(2, "0")}-${String(clock.day).padStart(2, "0")}`;
  return buildSlots(business, busyIso, 1).some((s) => s.dayKey === key);
}

export function nextAvailable(business: Pick<Business, "workHours" | "slotMinutes">, busyIso: string[] = []) {
  return buildSlots(business, busyIso, 10)[0] ?? null;
}

export { profileCompleteness } from "./search/completeness.ts";
