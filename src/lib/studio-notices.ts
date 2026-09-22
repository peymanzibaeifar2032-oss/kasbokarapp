export const STUDIO_PHONE_NOTICES_KEY = "studio-phone-notices";
export const STUDIO_SEEN_NOTICES_KEY = "studio-seen-notices";

type AndroidBridge = {
  showNotice?: (title: string, body: string) => void;
  noticesReady?: () => boolean;
};

function androidBridge(): AndroidBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as Window & { AndroidApp?: AndroidBridge }).AndroidApp;
  return bridge ?? null;
}

export function inStudioApp() {
  return Boolean(androidBridge());
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
