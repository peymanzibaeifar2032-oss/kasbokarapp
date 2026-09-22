import { tehranClock, tehranLocalToIso } from "@/lib/hours";

export const STUDIO_PHONE_NOTICES_KEY = "studio-phone-notices";
export const STUDIO_SEEN_NOTICES_KEY = "studio-seen-notices";

type AndroidBridge = {
  showNotice?: (title: string, body: string) => void;
  noticesReady?: () => boolean;
  setOwnerChrome?: (show: boolean) => void;
  scheduleNotice?: (id: string, title: string, body: string, whenMs: number) => void;
};

function androidBridge(): AndroidBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as Window & { AndroidApp?: AndroidBridge }).AndroidApp;
  return bridge ?? null;
}

export function inStudioApp() {
  if (typeof window === "undefined") return false;
  if (androidBridge()) return true;
  const ua = window.navigator.userAgent || "";
  return /TattooApp\//.test(ua) || /; wv\)/.test(ua);
}

/** Native gold admin bar stays hidden unless this mailbox is signed in. */
export function syncStudioOwnerChrome(isOwner: boolean) {
  try {
    androidBridge()?.setOwnerChrome?.(isOwner);
  } catch {
    /* older APK builds have no bridge method */
  }
}

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(STUDIO_SEEN_NOTICES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function markStudioNoticesSeen(ids: string[]) {
  const next = [...new Set([...readSeen(), ...ids])].slice(-120);
  localStorage.setItem(STUDIO_SEEN_NOTICES_KEY, JSON.stringify(next));
}

export function unseenStudioNoticeIds(ids: string[]) {
  if (!localStorage.getItem(STUDIO_SEEN_NOTICES_KEY)) {
    markStudioNoticesSeen(ids);
    return [];
  }
  const seen = new Set(readSeen());
  return ids.filter((id) => !seen.has(id));
}

export function phoneNoticesEnabled() {
  if (inStudioApp()) return true;
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted" &&
    localStorage.getItem(STUDIO_PHONE_NOTICES_KEY) === "1"
  );
}

export async function ensureStudioPhoneNotices() {
  if (inStudioApp()) {
    localStorage.setItem(STUDIO_PHONE_NOTICES_KEY, "1");
    return true;
  }
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") {
    localStorage.setItem(STUDIO_PHONE_NOTICES_KEY, "1");
    return true;
  }
  if (Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;
  localStorage.setItem(STUDIO_PHONE_NOTICES_KEY, "1");
  return true;
}

export async function enableStudioPhoneNotices() {
  const ok = await ensureStudioPhoneNotices();
  if (!ok) throw new Error("اجازه اعلان داده نشد.");
  showStudioOsNotice(
    "اعلان نوبت تاتو فعال شد",
    "بعد از هر تأیید یا پیام پیمان، وضعیت در اعلان گوشی می‌آید.",
    "studio-enabled",
  );
}

export function showStudioOsNotice(title: string, body: string, id: string) {
  const app = androidBridge();
  if (app?.showNotice) {
    try {
      app.showNotice(title, body);
    } catch {
      /* ignore bridge errors */
    }
    return;
  }
  if (!phoneNoticesEnabled()) return;
  try {
    new Notification(title, {
      body,
      icon: "/apps/tattoo-app-icon.png",
      tag: id,
      dir: "rtl",
      lang: "fa",
    });
  } catch {
    /* WebView without notification support */
  }
}

const PREP_SHOWN_KEY = "studio-prep-shown";

function tehranDayBefore(slotIso: string) {
  const clock = tehranClock(new Date(slotIso));
  const prev = new Date(Date.UTC(clock.y, clock.m - 1, clock.day - 1));
  return {
    y: prev.getUTCFullYear(),
    m: prev.getUTCMonth() + 1,
    d: prev.getUTCDate(),
  };
}

/** Morning and night of the day before the session. Past alarms are skipped. */
export function tattooPrepReminders(slotIso: string, name: string, now = Date.now()) {
  const day = tehranDayBefore(slotIso);
  const slotAt = Date.parse(slotIso);
  const items = [
    {
      id: `prep-am-${slotIso}`,
      at: Date.parse(tehranLocalToIso(day.y, day.m, day.d, 9, 0)),
      title: "فردا وقت تاتو داری",
      body: `${name}، فردا نوبت تاتو داری. تا شب استراحت کن، آب زیاد بنوش، الکل نخور و بخش آموزش را بخوان.`,
    },
    {
      id: `prep-pm-${slotIso}`,
      at: Date.parse(tehranLocalToIso(day.y, day.m, day.d, 20, 0)),
      title: "امشب برای تاتوی فردا آماده شو",
      body: "شب زود بخواب. محل تاتو را چرب و آفتاب‌سوخته نکن. فردا غذای سبک بخور و سر وقت بیا.",
    },
  ];
  return items.filter((item) => Number.isFinite(item.at) && item.at > now + 30_000 && item.at < slotAt);
}

export function scheduleTattooPrepNotices(slotIso: string, name: string) {
  if (!slotIso) return;
  const upcoming = tattooPrepReminders(slotIso, name);
  const bridge = androidBridge();
  for (const item of upcoming) {
    if (bridge?.scheduleNotice) {
      try {
        bridge.scheduleNotice(item.id, item.title, item.body, item.at);
      } catch {
        /* older app builds ignore scheduling */
      }
    }
  }
  const day = tehranDayBefore(slotIso);
  const clock = tehranClock();
  const isDayBefore = clock.y === day.y && clock.m === day.m && clock.day === day.d;
  if (!isDayBefore || Date.now() >= Date.parse(slotIso)) return;
  const shown = new Set((localStorage.getItem(PREP_SHOWN_KEY) || "").split(",").filter(Boolean));
  const id = `prep-now-${slotIso}`;
  if (shown.has(id)) return;
  showStudioOsNotice(
    "فردا وقت تاتو داری",
    `${name}، از الان تا شب خودت را آماده کن. راهنمای قبل از تاتو در بخش آموزش است.`,
    id,
  );
  shown.add(id);
  localStorage.setItem(PREP_SHOWN_KEY, [...shown].slice(-80).join(","));
}
