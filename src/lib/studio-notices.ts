export const STUDIO_PHONE_NOTICES_KEY = "studio-phone-notices";
export const STUDIO_SEEN_NOTICES_KEY = "studio-seen-notices";

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
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted" &&
    localStorage.getItem(STUDIO_PHONE_NOTICES_KEY) === "1"
  );
}

export async function enableStudioPhoneNotices() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("این دستگاه اعلان سیستم را پشتیبانی نمی‌کند.");
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    throw new Error("اجازه اعلان داده نشد. از تنظیمات گوشی برای این اپ اجازه بده.");
  }
  localStorage.setItem(STUDIO_PHONE_NOTICES_KEY, "1");
  showStudioOsNotice(
    "اعلان نوبت تاتو فعال شد",
    "بعد از هر تأیید یا پیام پیمان، وضعیت در اعلان گوشی می‌آید.",
    "studio-enabled",
  );
}

export function showStudioOsNotice(title: string, body: string, id: string) {
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
