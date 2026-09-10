export const APP_VERSION = "2026.09.10";
export const GUIDE_NAME = "راهنمای کسب‌وکار";
export const MAX_GUIDE_MESSAGE = 800;
export const MAX_GUIDE_HISTORY = 8;
export const MAX_BUG_HISTORY = 20;
export const OUT_OF_SCOPE_LIMIT = 3;
export const OUT_OF_SCOPE_REPLY =
  "من راهنمای سامانه کسب‌وکار هستم و فقط می‌توانم درباره استفاده از این سامانه و مشکلات آن راهنمایی کنم.";
export const INJECTION_REPLY =
  "این درخواست را انجام نمی‌دهم. من فقط راهنمای استفاده از سامانه کسب‌وکار هستم.";

/** Off-topic only gets the canned sentence. The widget never hard-locks. */
export function shouldHardLockGuide(_oosStreak: number): boolean {
  return false;
}
