import type { Business, PriceItem, SpecialDay, WorkHour, WorkShift } from "@/lib/types";
import { jalaliMonthGrid, type JalaliCell } from "./calendar/jalali.ts";

export const DEFAULT_BOOKING_HORIZON_DAYS = 60;
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

export function shiftTehranDayKey(dayKey: string, days: number) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

/** Saturday-to-Friday week in Tehran. Offset 0 is the week containing `from`. */
export function tehranWeekBounds(weekOffset = 0, from = new Date()) {
  const clock = tehranClock(from);
  const fromSaturday = (clock.weekday + 1) % 7;
  const startKey = shiftTehranDayKey(tehranDayKey(from), -fromSaturday + weekOffset * 7);
  const endKey = shiftTehranDayKey(startKey, 7);
  const [sy, sm, sd] = startKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  return {
    startKey,
    endKey,
    start: tehranLocalToIso(sy, sm, sd, 0, 0),
    end: tehranLocalToIso(ey, em, ed, 0, 0),
  };
}

/** First day with no tattoo job and no apprentice Thursday. */
export function firstOpenCustomerDay(occupied: Iterable<string>, thursdays: Iterable<string>, from = new Date()) {
  const busy = new Set(occupied);
  const thu = new Set(thursdays);
  let key = tehranDayKey(from);
  for (let i = 0; i < 90; i += 1) {
    if (!busy.has(key) && !thu.has(key)) return key;
    key = shiftTehranDayKey(key, 1);
  }
  return tehranDayKey(from);
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

export function shiftsFor(hours: WorkHour | undefined): WorkShift[] {
  if (!hours || hours.closed) return [];
  if (hours.shifts?.length) {
    return hours.shifts.filter((s) => s.open && s.close);
  }
  if (hours.open && hours.close) return [{ open: hours.open, close: hours.close }];
  return [];
}

export function jalaliDayLabel(y: number, m: number, day: number) {
  const iso = tehranLocalToIso(y, m, day, 12, 0);
  return new Date(iso).toLocaleDateString("fa-IR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Tehran",
  });
}

export function serviceBuffers(
  prices: PriceItem[] | undefined,
  serviceTitle: string | null | undefined,
): { before: number; after: number } {
  const item = serviceTitle ? (prices ?? []).find((p) => p.title === serviceTitle) : undefined;
  const before = Math.max(0, Math.min(180, Math.round(item?.bufferBefore ?? 0)));
  const after = Math.max(0, Math.min(180, Math.round(item?.bufferAfter ?? 0)));
  return { before, after };
}

export function occupancyRange(startIso: string, endIso: string, before = 0, after = 0) {
  const start = new Date(startIso).getTime() - before * 60000;
  const end = new Date(endIso).getTime() + after * 60000;
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}

export function isOpenNow(hours: WorkHour[], date = new Date(), special: SpecialDay[] = []) {
  const clock = tehranClock(date);
  const key = tehranDayKey(date);
  const override = special.find((s) => s.dayKey === key);
  const shifts = override
    ? override.closed
      ? []
      : override.shifts ?? []
    : shiftsFor(hoursForDay(hours, clock.weekday));
  if (!shifts.length) return false;
  const now = clock.hh * 60 + clock.mm;
  return shifts.some((s) => {
    const open = minutesOf(s.open);
    let close = minutesOf(s.close);
    if (close <= open) close += 24 * 60;
    return now >= open && now < close;
  });
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

export type BusyInterval = { start: string; end: string; resourceId?: string | null };
export type BusyInput = string | BusyInterval;

export type SlotOption = {
  iso: string;
  endIso: string;
  label: string;
  dayKey: string;
  dayLabel: string;
  state: "free" | "full";
};

export type DayStatus = "free" | "limited" | "full" | "booked" | "thursday" | "closed" | "past" | "beyond";

export type AvailabilityOptions = {
  specialDays?: SpecialDay[];
  bufferBefore?: number;
  bufferAfter?: number;
  /** When true, occupied candidate times are returned as state=full. */
  includeOccupied?: boolean;
};

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
  options: AvailabilityOptions = {},
) {
  return buildSlotGrid(business, busy, days, now, durationMinutes, options).filter((s) => s.state === "free");
}

export function buildSlotGrid(
  business: Pick<Business, "workHours" | "slotMinutes">,
  busy: BusyInput[] = [],
  days = 7,
  now: Date = new Date(),
  durationMinutes?: number,
  options: AvailabilityOptions = {},
) {
  const duration = Math.max(10, durationMinutes ?? (business.slotMinutes || 60));
  const durationMs = duration * 60000;
  const padBefore = Math.max(0, options.bufferBefore ?? 0) * 60000;
  const padAfter = Math.max(0, options.bufferAfter ?? 0) * 60000;
  const ranges = toBusyRanges(busy, durationMs);
  const out: SlotOption[] = [];
  const clock = tehranClock(now);
  const map = new Map(business.workHours.map((h) => [h.day, h]));
  const special = new Map((options.specialDays ?? []).map((s) => [s.dayKey, s]));
  const longJob = duration >= 12 * 60;
  const daySpan = longJob ? Math.max(1, Math.round(duration / (24 * 60))) : 1;
  const windowDays = longJob ? Math.max(days, daySpan * 5) : days;
  const minStart = now.getTime() + 20 * 60000;
  const includeOccupied = Boolean(options.includeOccupied);

  for (let i = 0; i < windowDays; i++) {
    const base = new Date(Date.UTC(clock.y, clock.m - 1, clock.day + i));
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth() + 1;
    const day = base.getUTCDate();
    const weekday = base.getUTCDay();
    const name = WEEKDAYS_FA[weekday];
    const dayKeyIso = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const override = special.get(dayKeyIso);
    const weekly = map.get(name);
    const shifts = override ? (override.closed ? [] : override.shifts?.length ? override.shifts : []) : shiftsFor(weekly);
    const dayLabel = jalaliDayLabel(y, m, day);

    if (!shifts.length) continue;

    const pushSlot = (hh: number, mm: number) => {
      const iso = tehranLocalToIso(y, m, day, hh, mm);
      const ms = new Date(iso).getTime();
      if (ms < minStart) return;
      const endMs = ms + durationMs;
      const occStart = ms - padBefore;
      const occEnd = endMs + padAfter;
      const taken = conflicts(occStart, occEnd, ranges);
      if (taken && !includeOccupied) return;
      out.push({
        iso,
        endIso: new Date(endMs).toISOString(),
        label: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
        dayKey: dayKeyIso,
        dayLabel,
        state: taken ? "full" : "free",
      });
    };

    if (longJob) {
      if (i % daySpan !== 0) continue;
      const first = shifts[0];
      const openM = minutesOf(first.open);
      pushSlot(Math.floor((openM % (24 * 60)) / 60), openM % 60);
      continue;
    }

    for (const shift of shifts) {
      const openM = minutesOf(shift.open);
      let closeM = minutesOf(shift.close);
      if (closeM <= openM) closeM += 24 * 60;
      for (let t = openM; t + duration <= closeM; t += duration) {
        const hh = Math.floor((t % (24 * 60)) / 60);
        const mm = t % 60;
        pushSlot(hh, mm);
      }
    }
  }
  return out;
}

export function dayStatuses(
  business: Pick<Business, "workHours" | "slotMinutes">,
  busy: BusyInput[] = [],
  days = 14,
  now: Date = new Date(),
  durationMinutes?: number,
  options: AvailabilityOptions = {},
): { dayKey: string; dayLabel: string; status: DayStatus; freeCount: number }[] {
  const grid = buildSlotGrid(business, busy, days, now, durationMinutes, { ...options, includeOccupied: true });
  const clock = tehranClock(now);
  const todayKey = tehranDayKey(now);
  const special = new Map((options.specialDays ?? []).map((s) => [s.dayKey, s]));
  const map = new Map(business.workHours.map((h) => [h.day, h]));
  const out: { dayKey: string; dayLabel: string; status: DayStatus; freeCount: number }[] = [];
  for (let i = 0; i < days; i++) {
    const base = new Date(Date.UTC(clock.y, clock.m - 1, clock.day + i));
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth() + 1;
    const day = base.getUTCDate();
    const weekday = base.getUTCDay();
    const dayKey = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayLabel = jalaliDayLabel(y, m, day);
    if (dayKey < todayKey) {
      out.push({ dayKey, dayLabel, status: "past", freeCount: 0 });
      continue;
    }
    const override = special.get(dayKey);
    const weekly = map.get(WEEKDAYS_FA[weekday]);
    const closed = override ? override.closed || !(override.shifts && override.shifts.length) : !shiftsFor(weekly).length;
    const rows = grid.filter((s) => s.dayKey === dayKey);
    const freeCount = rows.filter((s) => s.state === "free").length;
    let status: DayStatus = "free";
    if (closed && !rows.length) status = "closed";
    else if (!freeCount) status = "full";
    else if (freeCount <= 2) status = "limited";
    out.push({ dayKey, dayLabel, status, freeCount });
  }
  return out;
}

export function statusForDay(
  dayKey: string,
  rows: { dayKey: string; state: "free" | "full" }[],
  opts: {
    todayKey: string;
    horizonKey: string;
    closed: boolean;
  },
): DayStatus {
  if (dayKey < opts.todayKey) return "past";
  if (dayKey > opts.horizonKey) return "beyond";
  const freeCount = rows.filter((s) => s.dayKey === dayKey && s.state === "free").length;
  if (opts.closed && !freeCount) return "closed";
  if (!freeCount) return "full";
  if (freeCount <= 2) return "limited";
  return "free";
}

export function horizonDayKey(now: Date, days = DEFAULT_BOOKING_HORIZON_DAYS) {
  const clock = tehranClock(now);
  const end = new Date(Date.UTC(clock.y, clock.m - 1, clock.day + Math.max(0, days)));
  return `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-${String(end.getUTCDate()).padStart(2, "0")}`;
}

export function isClosedOn(
  business: Pick<Business, "workHours">,
  dayKey: string,
  weekday: number,
  specialDays: SpecialDay[] = [],
) {
  const override = specialDays.find((s) => s.dayKey === dayKey);
  if (override) return override.closed || !(override.shifts && override.shifts.length);
  return !shiftsFor(hoursForDay(business.workHours, weekday)).length;
}

export type MonthDayState = {
  cell: JalaliCell;
  status: DayStatus;
  freeCount: number;
};

export function monthDayStates(
  business: Pick<Business, "workHours" | "slotMinutes">,
  busy: BusyInput[],
  jy: number,
  jm: number,
  now: Date,
  durationMinutes: number | undefined,
  options: AvailabilityOptions = {},
  horizonDays = DEFAULT_BOOKING_HORIZON_DAYS,
): MonthDayState[] {
  const cells = jalaliMonthGrid(jy, jm);
  const todayKey = tehranDayKey(now);
  const horizonKey = horizonDayKey(now, horizonDays);
  const grid = buildSlotGrid(business, busy, horizonDays, now, durationMinutes, { ...options, includeOccupied: true });
  return cells.map((cell) => {
    const closed = isClosedOn(business, cell.dayKey, new Date(Date.UTC(cell.gy, cell.gm - 1, cell.gd)).getUTCDay(), options.specialDays);
    const rows = grid.filter((s) => s.dayKey === cell.dayKey);
    const status = statusForDay(cell.dayKey, rows, { todayKey, horizonKey, closed });
    return { cell, status, freeCount: rows.filter((s) => s.state === "free").length };
  });
}

export function hasFreeToday(
  business: Pick<Business, "workHours" | "slotMinutes">,
  busy: BusyInput[] = [],
  now: Date = new Date(),
  durationMinutes?: number,
  options: AvailabilityOptions = {},
) {
  const key = tehranDayKey(now);
  return buildSlots(business, busy, 1, now, durationMinutes, options).some((s) => s.dayKey === key);
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
  options: AvailabilityOptions = {},
) {
  return buildSlots(business, busy, 10, now, durationMinutes, options)[0] ?? null;
}

export { profileCompleteness } from "./search/completeness.ts";
