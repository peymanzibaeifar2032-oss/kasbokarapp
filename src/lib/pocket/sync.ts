import { saveAction } from "@/lib/save";
import { parsePocketSnapshot } from "@/lib/pocket/sync-response";

import { pocketAccessResult } from "@/lib/pocket/access-status";

export const POCKET_EXPORT_ENDPOINT = "https://kasbokarapp.com/api/save";
type ExportResult = { requestId: string; status: number; data?: unknown; error?: string };
type PocketBridge = {
  downloadPocketBookings?: (requestId: string) => void;
  verifyPocketAccount?: (requestId: string) => void;
  openPocketLogin?: () => void;
  activatePocketLicense?: (requestId: string, code: string, device: string) => void;
  refreshPocketLicense?: (requestId: string, token: string, device: string) => void;
  selfPocketLicense?: (requestId: string, device: string) => void;
};

function bridge(): PocketBridge | undefined {
  return (window as Window & { AndroidApp?: PocketBridge }).AndroidApp;
}

export const OFFLINE_MESSAGE = "گوشی به اینترنت وصل نیست. اطلاعات روی گوشی سالم است؛ بعد از اتصال دوباره امتحان کنید.";

/** navigator.onLine === false is reliable for "no network at all"; true only means "maybe online". */
export function deviceOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function isOfflinePocket() {
  return window.location.hostname === "appassets.androidplatform.net";
}

export function openPocketLogin() {
  if (isOfflinePocket()) {
    const native = bridge();
    if (!native?.openPocketLogin)
      throw new Error("اتصال برنامه به سایت آماده نیست. برنامه را یک بار ببندید و دوباره باز کنید.");
    native.openPocketLogin();
  } else {
    window.location.assign("/login?next=/studio/pocket");
  }
}

/** Calls one of the fixed native read-only actions; JS never supplies a URL, action body or cookie. */
function nativeCall(method: "downloadPocketBookings" | "verifyPocketAccount", timeoutMs: number) {
  const native = bridge();
  const fn = native?.[method];
  if (!native || !fn)
    return Promise.reject(new Error("اتصال برنامه به سایت آماده نیست. برنامه را یک بار ببندید و دوباره باز کنید."));
  if (deviceOffline()) return Promise.reject(new Error(OFFLINE_MESSAGE));
  return new Promise<{ status: number; data: unknown }>((resolve, reject) => {
    const requestId = `pocket-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener("pocket-export-result", receive);
    };
    const receive = (event: Event) => {
      const result = (event as CustomEvent<ExportResult>).detail;
      if (!result || result.requestId !== requestId) return;
      cleanup();
      if (result.status === 0 && result.error === "SYNC_BUSY") {
        reject(new Error("دریافت قبلی هنوز در جریان است؛ چند ثانیه صبر کنید."));
        return;
      }
      if (result.status === 0) {
        reject(new Error(deviceOffline() ? OFFLINE_MESSAGE : "سرور در دسترس نیست یا اینترنت ضعیف است. اطلاعات گوشی دست نخورده است."));
        return;
      }
      resolve({ status: result.status, data: result.data });
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("پاسخ سرور به‌موقع نرسید (اینترنت ضعیف است). اطلاعات گوشی دست نخورده است؛ دوباره تلاش کنید."));
    }, timeoutMs);
    window.addEventListener("pocket-export-result", receive);
    try {
      fn.call(native, requestId);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

export async function downloadPocketSnapshot() {
  if (!isOfflinePocket()) {
    return parsePocketSnapshot(200, await saveAction("studioPocketExport"));
  }
  // Never fetch /api/save against the virtual asset origin, and never do a cross-origin cookie fetch.
  const result = await nativeCall("downloadPocketBookings", 100000);
  return parsePocketSnapshot(result.status, result.data);
}

export async function downloadPocketBookings() {
  return (await downloadPocketSnapshot()).bookings;
}

/** Server-verified role probe. Never throws: any failure hides owner-only UI. */
export async function verifyPocketAccess() {
  try {
    if (!isOfflinePocket()) {
      return pocketAccessResult(200, await saveAction("studioPocketAccess"));
    }
    const native = bridge();
    if (!native?.verifyPocketAccount || deviceOffline()) return pocketAccessResult(0, null);
    const result = await nativeCall("verifyPocketAccount", 30000);
    return pocketAccessResult(result.status, result.data);
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
    return pocketAccessResult(status, null);
  }
}

export type LicenseReply = { status: number; data: unknown };
type LicenseMethod = "activatePocketLicense" | "refreshPocketLicense" | "selfPocketLicense";

/** Native license transport (fixed endpoints in Java). JS supplies only validated code/token/device strings. */
export function licenseCall(method: LicenseMethod, args: string[], timeoutMs = 30000): Promise<LicenseReply> {
  const native = bridge();
  const fn = native?.[method] as ((...a: string[]) => void) | undefined;
  if (!native || !fn) return Promise.reject(new Error("فعال‌سازی فقط داخل اپ اندروید انجام می‌شود. اگر داخل اپ هستید، برنامه را ببندید و دوباره باز کنید."));
  if (deviceOffline()) return Promise.reject(new Error(OFFLINE_MESSAGE));
  return new Promise((resolve, reject) => {
    const requestId = `lic-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const cleanup = () => { window.clearTimeout(timer); window.removeEventListener("pocket-export-result", receive); };
    const receive = (event: Event) => {
      const result = (event as CustomEvent<ExportResult>).detail;
      if (!result || result.requestId !== requestId) return;
      cleanup();
      if (result.status === 0) reject(new Error("سرور در دسترس نیست. اتصال اینترنت را بررسی کنید."));
      else resolve({ status: result.status, data: result.data });
    };
    const timer = window.setTimeout(() => { cleanup(); reject(new Error("پاسخ سرور به‌موقع نرسید.")); }, timeoutMs);
    window.addEventListener("pocket-export-result", receive);
    try { fn.call(native, requestId, ...args); } catch (e) { cleanup(); reject(e); }
  });
}
