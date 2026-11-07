/**
 * Every ready-made SMS of the website (src/lib/tattoo-flow.ts, src/lib/studio-apprentices.ts) offered in the
 * Pocket app with the SAME text functions (single source, no copies), filled with the booking's real data.
 * The app only opens the phone's own SMS composer (sms: link) or copies the text — it never sends.
 */
import {
  aftercareGuideSms, aftercareSms, balanceSms, bookingConfirmSms, bookingReminderSms, depositCardSms,
  fillInMissedCallSms, fillInOfferSms, fillInRegisteredSms, honorificForName, prepBeforeTattooSms,
  proposalSeenSms, sessionFoodSms, tattooBalance,
} from "../tattoo-flow.ts";
import { apprenticeJoinedSms, apprenticePracticeSms, apprenticeThursdaySms } from "../studio-apprentices.ts";
import { JALALI_MONTHS, jalaliToGregorian, toFaDigits } from "../calendar/jalali.ts";
import { toEnDigits } from "../format.ts";
import type { PocketBooking } from "../pocket-book.ts";
import type { Trainee } from "./trainees.ts";

export type BookingSmsKind =
  | "confirm" | "card" | "balance" | "prep" | "food" | "care" | "reminder"
  | "care-wash" | "care-itch" | "care-month" | "proposal-seen" | "fillin-offer" | "fillin-missed" | "fillin-registered";
export type TraineeSmsKind = "trainee-joined" | "trainee-thursday" | "trainee-practice";

/** Labels and the website function each one comes from (shown in the app and documented in 1.15.1.md). */
export const BOOKING_SMS: { kind: BookingSmsKind; label: string; group: string; source: string }[] = [
  { kind: "confirm", label: "قطعی شدن نوبت", group: "نوبت", source: "bookingConfirmSms" },
  { kind: "reminder", label: "یادآوری نوبت", group: "نوبت", source: "bookingReminderSms" },
  { kind: "card", label: "شماره کارت برای بیعانه", group: "پول", source: "depositCardSms" },
  { kind: "balance", label: "مانده حساب", group: "پول", source: "balanceSms" },
  { kind: "prep", label: "آماده‌سازی قبل تاتو", group: "آماده‌سازی", source: "prepBeforeTattooSms" },
  { kind: "food", label: "خوراکی حین کار", group: "آماده‌سازی", source: "sessionFoodSms" },
  { kind: "care", label: "راهنمای مراقبت بعد تاتو", group: "مراقبت", source: "aftercareGuideSms" },
  { kind: "care-wash", label: "مراقبت: شستشو (آقا/خانم خودکار)", group: "مراقبت", source: "aftercareSms(wash)" },
  { kind: "care-itch", label: "مراقبت: خارش", group: "مراقبت", source: "aftercareSms(itch)" },
  { kind: "care-month", label: "مراقبت: تا یک ماه", group: "مراقبت", source: "aftercareSms(month)" },
  { kind: "proposal-seen", label: "درخواستت دیده شد", group: "درخواست", source: "proposalSeenSms" },
  { kind: "fillin-offer", label: "جای خالی امروز (پیشنهاد)", group: "لیست کنسلی", source: "fillInOfferSms" },
  { kind: "fillin-missed", label: "جای خالی: زنگ بزن", group: "لیست کنسلی", source: "fillInMissedCallSms" },
  { kind: "fillin-registered", label: "ثبت در لیست کنسلی", group: "لیست کنسلی", source: "fillInRegisteredSms" },
];

export const TRAINEE_SMS: { kind: TraineeSmsKind; label: string; source: string }[] = [
  { kind: "trainee-joined", label: "پیوستن به لیست هنرجوها", source: "apprenticeJoinedSms" },
  { kind: "trainee-thursday", label: "اعلام آمادگی چهارشنبه", source: "apprenticeThursdaySms" },
  { kind: "trainee-practice", label: "ارسال تمرین‌ها", source: "apprenticePracticeSms" },
];

const shortHonorific = (name: string): "آقا" | "خانم" => (honorificForName(name) === "خانم" ? "خانم" : "آقا");

/** Jalali "1405-08-16" + "14:30" (Tehran wall clock) → ISO instant; null when unknown. */
export function bookingInstant(row: Pick<PocketBooking, "day" | "time" | "server">): string | null {
  if (row.server?.slotStart && !Number.isNaN(Date.parse(row.server.slotStart))) return row.server.slotStart;
  const [jy, jm, jd] = toEnDigits(row.day || "").split("-").map(Number);
  const tm = /^(\d{1,2}):(\d{2})$/.exec(toEnDigits(row.time || ""));
  if (!jy || !jm || !jd || !tm) return null;
  const g = jalaliToGregorian(jy, jm, jd);
  const utc = Date.UTC(g.gy, g.gm - 1, g.gd, Number(tm[1]), Number(tm[2])) - 3.5 * 3600 * 1000;
  return new Date(utc).toISOString();
}

/** Real money for the booking: site data first, otherwise the local price (paid unknown ⇒ 0). */
export function bookingMoney(row: PocketBooking) {
  const s = row.server;
  const total = s?.priceMinToman || row.priceToman || 0;
  const paid = s ? (s.paidToman > 0 ? s.paidToman : s.depositToman || 0) : 0;
  return { total, paid, remaining: tattooBalance(total, paid).remaining };
}

export const HONORIFIC_CHOICE_KINDS: BookingSmsKind[] = ["care-wash", "care-itch", "care-month", "proposal-seen"];

/** opts.honorific mirrors the website's separate «آقا» / «خانم» buttons for aftercare and proposal SMS. */
export function bookingSmsText(row: PocketBooking, kind: BookingSmsKind, opts: { honorific?: "آقا" | "خانم" } = {}): string {
  const name = row.name || "";
  const h = opts.honorific ?? shortHonorific(name);
  const money = bookingMoney(row);
  const when = bookingInstant(row);
  switch (kind) {
    case "confirm": return bookingConfirmSms({ honorific: honorificForName(name), name, when, paidToman: money.paid });
    case "reminder": return bookingReminderSms({ honorific: honorificForName(name), name, when, remainingToman: money.remaining });
    case "card": return depositCardSms(name);
    case "balance": return balanceSms(name, money.total, row.server ? row.server.paidToman : money.paid);
    case "prep": return prepBeforeTattooSms(name);
    case "food": return sessionFoodSms(name);
    case "care": return aftercareGuideSms(name);
    case "care-wash": return aftercareSms("wash", name, h);
    case "care-itch": return aftercareSms("itch", name, h);
    case "care-month": return aftercareSms("month", name, h);
    case "proposal-seen": return proposalSeenSms(name, toEnDigits(row.phone || row.server?.phone2 || ""), h);
    case "fillin-offer": return fillInOfferSms(name, row.server?.idea || row.style || "", money.total);
    case "fillin-missed": return fillInMissedCallSms(name);
    case "fillin-registered": return fillInRegisteredSms(name);
  }
}

export function traineeSmsText(person: Pick<Trainee, "name" | "honorific" | "startedOn">, kind: TraineeSmsKind): string {
  if (kind === "trainee-thursday") return apprenticeThursdaySms();
  if (kind === "trainee-practice") return apprenticePracticeSms();
  const honorific: "آقا" | "خانم" = person.honorific === "خانم" ? "خانم" : person.honorific === "آقا" ? "آقا" : shortHonorific(person.name);
  const [jy, jm, jd] = toEnDigits(person.startedOn || "").split("-").map(Number);
  const dayLabel = jy && jm && jd ? `${toFaDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toFaDigits(jy)}` : "امروز";
  return apprenticeJoinedSms(honorific, person.name, dayLabel);
}

/** Missing-data warnings shown above the preview (never block: the user may still edit/send by hand). */
export function bookingSmsWarnings(row: PocketBooking, kind: BookingSmsKind): string[] {
  const out: string[] = [];
  if ((kind === "confirm" || kind === "reminder") && !bookingInstant(row)) out.push("ساعت این نوبت ثبت نشده؛ در متن «ثبت نشده» می‌آید. اول ساعت را وارد کنید.");
  if ((kind === "balance" || kind === "fillin-offer") && !bookingMoney(row).total) out.push("قیمت این نوبت ثبت نشده است.");
  return out;
}
