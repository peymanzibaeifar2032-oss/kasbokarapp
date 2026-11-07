/**
 * Mutation-layer license gate for the licensed offline Pocket bundle (1.15.0+).
 * Only data-changing writes call assertCanMutate(); reads, calls/SMS/WhatsApp and JSON/PDF export never do.
 * The gate is compiled in only for the APK bundle (vite define); the website and node tests are unaffected.
 */
declare const __POCKET_LICENSE_ENFORCED__: boolean | undefined;

export class LicenseLockedError extends Error {
  readonly locked = true;
}

type Checker = () => { ok: true } | { ok: false; reason: string };
let checker: Checker | null = null;

export function licenseEnforced() {
  return typeof __POCKET_LICENSE_ENFORCED__ !== "undefined" && __POCKET_LICENSE_ENFORCED__ === true;
}

export function setLicenseChecker(fn: Checker | null) {
  checker = fn;
}

export function assertCanMutate() {
  if (!licenseEnforced()) return;
  const r = checker ? checker() : { ok: false as const, reason: "برنامه هنوز فعال نشده است." };
  if (!r.ok) throw new LicenseLockedError(r.reason + " اطلاعات شما حفظ شده و خروجی JSON/PDF در دسترس است.");
}

export function isLicenseLockedError(e: unknown): e is LicenseLockedError {
  return !!e && typeof e === "object" && (e as { locked?: unknown }).locked === true;
}
