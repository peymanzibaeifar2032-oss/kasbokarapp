import { parsePocketAccess } from "./sync-response.ts";

export type PocketAccessState = "checking" | "login-required" | "not-owner" | "activation-required" | "owner-activation-required" | "verified" | "unavailable";

/** Diagnostics do not grant access: only the strict server account parser can do that. */
export function pocketAccessResult(status: number, data: unknown) {
  const parsed = parsePocketAccess(status, data);
  const state: PocketAccessState = parsed.account
    ? !parsed.account.isOwner ? "not-owner"
      : parsed.account.canViewAppStats ? "verified" : "owner-activation-required"
    : status === 401 ? "login-required"
      : status === 403 ? "not-owner"
        : status === 400 || status === 404 || (status >= 200 && status < 300)
          ? "activation-required" : "unavailable";
  return { ...parsed, state };
}
export function pocketAccessMessage(state: PocketAccessState, english: boolean) {
  const messages = {
    checking: ["در حال بررسی نشست حساب سایت…", "Checking your website session…"],
    "login-required": ["هنوز داخل اپ وارد سایت نشده‌اید یا نشست منقضی شده است. ورود امن را بزنید و با ایمیل و رمز حساب سایت وارد شوید؛ ایمیل آفلاین کافی نیست.", "Sign in inside this app with your website email and password. Your offline email is not a login."],
    "not-owner": ["حساب واردشده مجوز مالک ندارد. برای امکانات مالک با حساب اصلی سایت وارد شوید.", "This website session is not authorized as the owner. Sign in with the site's owner account."],
    "activation-required": ["تأیید حساب با نسخهٔ فعلی سرور ممکن نیست؛ به‌روزرسانی و فعال‌سازی سرور لازم است. تغییر ایمیل آفلاین این مشکل را حل نمی‌کند.", "The server cannot verify this account yet. A server update/activation is required; changing the offline email will not fix this."],
    "owner-activation-required": ["حساب مالک تأیید شد، اما سرویس آمار سرور آماده نیست؛ انتشار backend و بررسی مهاجرت 0058 لازم است.", "Owner verified, but the statistics service is not ready. Deploy the backend and check migration 0058."],
    verified: ["حساب مالک از طریق نشست معتبر سایت تأیید شد.", "Owner verified through your authenticated website session."],
    unavailable: ["بررسی حساب انجام نشد؛ اتصال اینترنت یا سرور را بررسی و دوباره تلاش کنید. دسترسی مالک تا تأیید سرور فعال نمی‌شود.", "Account check failed. Check your connection/server and try again. Owner access remains locked until verified."],
  };
  return messages[state][english ? 1 : 0];
}
