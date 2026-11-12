import { gregorianToJalali, jalaliToGregorian, type JalaliCell } from "../calendar/jalali.ts";

/** Sunday-first week labels for the English (Gregorian) calendar view. */
export const WEEK_EN_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const DAY_MS = 86400000;

function cellAt(utc: number, inMonth: boolean): JalaliCell {
  const d = new Date(utc);
  const gy = d.getUTCFullYear();
  const gm = d.getUTCMonth() + 1;
  const gd = d.getUTCDate();
  const j = gregorianToJalali(gy, gm, gd);
  return {
    gy,
    gm,
    gd,
    jy: j.jy,
    jm: j.jm,
    jd: j.jd,
    dayKey: `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`,
    inMonth,
    satIndex: (d.getUTCDay() + 1) % 7,
  };
}

/**
 * Gregorian month grid (Sunday first) for the English UI. Every cell still carries its Jalali date,
 * so bookings keep one storage key (`jy-jm-jd`) whichever calendar the user looks at.
 */
export function gregorianMonthGrid(gy: number, gm: number): JalaliCell[] {
  const first = Date.UTC(gy, gm - 1, 1);
  const days = new Date(Date.UTC(gy, gm, 0)).getUTCDate();
  const pad = new Date(first).getUTCDay();
  const cells: JalaliCell[] = [];
  for (let i = pad; i > 0; i--) cells.push(cellAt(first - i * DAY_MS, false));
  for (let d = 0; d < days; d++) cells.push(cellAt(first + d * DAY_MS, true));
  while (cells.length % 7 !== 0) cells.push(cellAt(first + (cells.length - pad) * DAY_MS, false));
  return cells;
}

export function shiftGregorianMonth(gy: number, gm: number, delta: number) {
  const abs = gy * 12 + (gm - 1) + delta;
  return { gy: Math.floor(abs / 12), gm: (abs % 12) + 1 };
}

/** `1405-08-21` → its Gregorian date, or null for a malformed key. */
export function gregorianOfKey(key: string) {
  const [jy, jm, jd] = key.split("-").map(Number);
  if (!jy || !jm || !jd) return null;
  return jalaliToGregorian(jy, jm, jd);
}

export function formatGregorian(g: { gy: number; gm: number; gd: number }, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(g.gy, g.gm - 1, g.gd)));
}
