import { STUDIO_ADDRESS } from "@/lib/tattoo-flow";

function slotParts(when?: string | null) {
  const date = when ? new Date(when) : null;
  const valid = Boolean(date && !Number.isNaN(date.getTime()));
  return {
    weekday: valid
      ? date!.toLocaleDateString("fa-IR", { weekday: "long", timeZone: "Asia/Tehran" })
      : "ثبت‌نشده",
    date: valid
      ? date!.toLocaleDateString("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tehran" })
      : "ثبت‌نشده",
    time: valid
      ? date!.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" })
      : "",
  };
}

/** 24-hour reminder. No 2-hour message. */
export function tattooReminder24hText(when?: string | null) {
  const part = slotParts(when);
  const clock = part.time ? ` ساعت ${part.time}` : "";
  return [
    `سلام، فردا ${part.weekday} ${part.date}${clock} نوبت تاتو داری.`,
    `آدرس: ${STUDIO_ADDRESS}`,
    "لطفاً الکل و قهوه نخور، خوب بخواب محل تاتو رو شیو کنید",
  ].join("\n");
}

export function tattooAftercareSameDayText(name?: string) {
  const who = name?.trim() ? `${name.trim()} عزیز، ` : "";
  return [
    `${who}مراقبت امشب بعد از تاتو:`,
    "پانسمان را طبق حرف استودیو بردار.",
    "با آب ولرم و شوینده ملایم بشور، خشک کن، پماد نازک بزن.",
    "نخواب روی محل تاتو و آن را نپوشان با لباس تنگ.",
  ].join("\n");
}

export function tattooAftercareDay5Text(name?: string) {
  const who = name?.trim() ? `${name.trim()} عزیز، ` : "";
  return [
    `${who}روز پنجم تاتو:`,
    "پوسته‌ها را نکن و نخاران.",
    "ورزش سنگین و استخر نه.",
    "اگر قرمزی یا ترشح غیرعادی دیدی، عکس بفرست.",
  ].join("\n");
}

export function tattooAftercareDay15Text(name?: string) {
  const who = name?.trim() ? `${name.trim()} عزیز، ` : "";
  return [
    `${who}روز پانزدهم تاتو:`,
    "جوش خوردن را چک کن. اگر جایی کم‌رنگ شد برای تاچ‌آپ بگو.",
    "ضدآفتاب روی محل التیام‌یافته بزن.",
  ].join("\n");
}

export const AFTERCARE_MESSAGES = [
  { id: "day0" as const, label: "همان شب", build: tattooAftercareSameDayText },
  { id: "day5" as const, label: "روز ۵", build: tattooAftercareDay5Text },
  { id: "day15" as const, label: "روز ۱۵", build: tattooAftercareDay15Text },
];
