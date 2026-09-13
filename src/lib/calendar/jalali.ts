/** Gregorian ↔ Jalali (Solar Hijri). Canonical storage stays Gregorian/timestamptz. */

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

/** Saturday-first Iranian week. */
export const WEEKDAY_SHORT_FA = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

function div(a: number, b: number) {
  return Math.trunc(a / b);
}

export function gregorianToJalali(gy: number, gm: number, gd: number) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  let gy2 = gy <= 1600 ? gy - 621 : gy - 1600;
  const gyMinus = gm > 2 ? gy2 + 1 : gy2;
  let days =
    365 * gy2 +
    div(gyMinus + 3, 4) -
    div(gyMinus + 99, 100) +
    div(gyMinus + 399, 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number) {
  let gy = jy <= 979 ? 621 : 1600;
  let jy2 = jy <= 979 ? jy : jy - 979;
  let days =
    365 * jy2 +
    div(jy2, 33) * 8 +
    div((jy2 % 33) + 3, 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * div(days, 146097);
  days %= 146097;
  if (days >= 36525) {
    days--;
    gy += 100 * div(days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days >= 366) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  let gd = days + 1;
  for (gm = 1; gm <= 12 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return { gy, gm, gd };
}

export function jalaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const g = jalaliToGregorian(jy + 1, 1, 1);
  const n = jalaliToGregorian(jy, 12, 30);
  const leap = Date.UTC(g.gy, g.gm - 1, g.gd) - Date.UTC(n.gy, n.gm - 1, n.gd) > 86400000;
  return leap ? 30 : 29;
}

export type JalaliCell = {
  gy: number;
  gm: number;
  gd: number;
  jy: number;
  jm: number;
  jd: number;
  dayKey: string;
  inMonth: boolean;
  /** 0 = Saturday … 6 = Friday */
  satIndex: number;
};

export function jalaliMonthGrid(jy: number, jm: number): JalaliCell[] {
  const len = jalaliMonthLength(jy, jm);
  const first = jalaliToGregorian(jy, jm, 1);
  const firstUtc = Date.UTC(first.gy, first.gm - 1, first.gd);
  const jsWeek = new Date(firstUtc).getUTCDay();
  const pad = (jsWeek + 1) % 7;
  const cells: JalaliCell[] = [];
  for (let i = 0; i < pad; i++) {
    const d = new Date(firstUtc - (pad - i) * 86400000);
    cells.push(fromUtc(d, false));
  }
  for (let jd = 1; jd <= len; jd++) {
    const g = jalaliToGregorian(jy, jm, jd);
    cells.push(cellOf(g, { jy, jm, jd }, true));
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const d = new Date(Date.UTC(last.gy, last.gm - 1, last.gd + 1));
    cells.push(fromUtc(d, false));
  }
  return cells;
}

function fromUtc(d: Date, inMonth: boolean): JalaliCell {
  const gy = d.getUTCFullYear();
  const gm = d.getUTCMonth() + 1;
  const gd = d.getUTCDate();
  return cellOf({ gy, gm, gd }, gregorianToJalali(gy, gm, gd), inMonth);
}

function cellOf(g: { gy: number; gm: number; gd: number }, j: { jy: number; jm: number; jd: number }, inMonth: boolean): JalaliCell {
  const jsWeek = new Date(Date.UTC(g.gy, g.gm - 1, g.gd)).getUTCDay();
  return {
    gy: g.gy,
    gm: g.gm,
    gd: g.gd,
    jy: j.jy,
    jm: j.jm,
    jd: j.jd,
    dayKey: `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`,
    inMonth,
    satIndex: (jsWeek + 1) % 7,
  };
}

export function shiftJalaliMonth(jy: number, jm: number, delta: number) {
  const abs = jy * 12 + (jm - 1) + delta;
  return { jy: Math.floor(abs / 12), jm: (abs % 12) + 1 };
}

export function toFaDigits(n: number | string) {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
