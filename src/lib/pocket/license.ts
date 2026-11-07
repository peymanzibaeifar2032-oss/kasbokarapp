/**
 * Offline license verification for the Pocket APK (1.15.0+).
 * - Trust anchors are PINNED at build time (license-keys.ts); never read from JSON, backups or server replies.
 * - Token = base64url(JSON).base64url(ECDSA P-256 / SHA-256, IEEE-P1363 signature) issued by kasbokarapp.com.
 * - Device id = SHA-256(random 256-bit install secret) — no hardware identifiers.
 * - Server time (iat) + recorded max trusted time detect clock rollback (cannot stop a modified/rooted APK).
 */
import { PINNED_LICENSE_KEYS, type PinnedKey } from "./license-keys.ts";

export const LICENSE_ISS = "kasbokarapp.com";
export const LICENSE_AUD = "pocket-tattoo-booking";
export const ROLLBACK_TOLERANCE_MS = 10 * 60 * 1000;
export const REFRESH_EVERY_MS = 6 * 60 * 60 * 1000;
const TOKEN_KEY = "pocket.license.v1";
const MAX_TIME_KEY = "pocket.license.maxTime.v1";
const INSTALL_KEY = "pocket.install.secret.v1";

export type LicensePayload = {
  v: number; iss: string; aud: string; kid: string; lid: string; dev: string;
  iat: number; nbf: number; exp: number; olu: number; self: boolean; n: string;
};

export type LicenseStatus = "valid" | "none" | "invalid" | "expired" | "offline_expired" | "revoked" | "not_yet" | "clock";
export type LicenseState = { status: LicenseStatus; reason: string; payload?: LicensePayload };

export const LICENSE_REASON: Record<LicenseStatus, string> = {
  valid: "مجوز فعال است.",
  none: "برای ثبت و ویرایش، برنامه را با کد فعال‌سازی یا ورود صاحب برنامه فعال کنید.",
  invalid: "مجوز این گوشی معتبر نیست. دوباره فعال کنید.",
  expired: "مهلت مجوز تمام شده است. برای تمدید با صاحب برنامه تماس بگیرید.",
  offline_expired: "مهلت کار آفلاین تمام شده است. یک بار به اینترنت وصل شوید و «بررسی دوباره» را بزنید.",
  revoked: "این مجوز لغو شده یا این گوشی از آن جدا شده است.",
  not_yet: "این مجوز هنوز شروع نشده است.",
  clock: "ساعت گوشی عقب‌تر از آخرین زمان معتبر است. تاریخ و ساعت گوشی را درست کنید یا آنلاین بررسی کنید.",
};

type Store = Pick<Storage, "getItem" | "setItem">;
const b64uToBytes = (s: string) => {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(t + "===".slice((t.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const toHex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

export async function installDeviceId(store: Store = localStorage, cryptoImpl: Crypto = crypto) {
  let secret = store.getItem(INSTALL_KEY);
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) {
    secret = toHex(cryptoImpl.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer);
    store.setItem(INSTALL_KEY, secret);
  }
  return toHex(await cryptoImpl.subtle.digest("SHA-256", new TextEncoder().encode("pocket-install:" + secret)));
}

/** Verifies signature + claims. Pure: keys/device/now/maxTrusted are inputs. */
export async function evaluateLicense(
  token: string | null | undefined,
  opts: { device: string; now: number; maxTrusted: number; keys?: readonly PinnedKey[]; subtle?: SubtleCrypto },
): Promise<LicenseState> {
  const st = (status: LicenseStatus, payload?: LicensePayload): LicenseState => ({ status, reason: LICENSE_REASON[status], payload });
  if (!token) return st("none");
  const parts = token.split(".");
  if (parts.length !== 2 || token.length > 4096) return st("invalid");
  let p: LicensePayload;
  try { p = JSON.parse(new TextDecoder().decode(b64uToBytes(parts[0]!))); } catch { return st("invalid"); }
  const key = (opts.keys ?? PINNED_LICENSE_KEYS).find((k) => k.kid === p?.kid);
  if (!key) return st("invalid");
  const subtle = opts.subtle ?? crypto.subtle;
  try {
    const pub = await subtle.importKey("spki", b64uToBytes(key.spki.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const ok = await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, b64uToBytes(parts[1]!), new TextEncoder().encode(parts[0]!));
    if (!ok) return st("invalid");
  } catch { return st("invalid"); }
  if (p.v !== 1 || p.iss !== LICENSE_ISS || p.aud !== LICENSE_AUD || typeof p.lid !== "string" || !p.lid) return st("invalid");
  if (p.dev !== opts.device) return st("invalid");
  if (![p.iat, p.nbf, p.exp, p.olu].every((n) => Number.isFinite(n)) || p.olu > p.exp) return st("invalid");
  const trusted = Math.max(opts.maxTrusted, p.iat * 1000);
  if (opts.now < trusted - ROLLBACK_TOLERANCE_MS) return st("clock", p);
  if (opts.now < p.nbf * 1000 - ROLLBACK_TOLERANCE_MS) return st("not_yet", p);
  if (opts.now >= p.exp * 1000) return st("expired", p);
  if (opts.now >= p.olu * 1000) return st("offline_expired", p);
  return st("valid", p);
}

export function readStoredLicense(store: Store = localStorage) {
  try {
    const raw = JSON.parse(store.getItem(TOKEN_KEY) || "null") as { token?: string; serverStatus?: LicenseStatus } | null;
    return raw && typeof raw.token === "string" ? raw : null;
  } catch { return null; }
}

export function storeLicense(token: string, store: Store = localStorage) {
  store.setItem(TOKEN_KEY, JSON.stringify({ token }));
}

/** Server said revoked/expired: keep the token (for the record) but remember the verdict. Data is never touched. */
export function markServerVerdict(status: "revoked" | "expired" | "invalid", store: Store = localStorage) {
  const cur = readStoredLicense(store);
  if (cur) store.setItem(TOKEN_KEY, JSON.stringify({ token: cur.token, serverStatus: status }));
}

export function bumpTrustedTime(ms: number, store: Store = localStorage) {
  const cur = Number(store.getItem(MAX_TIME_KEY)) || 0;
  const next = Math.max(cur, ms);
  if (next !== cur) store.setItem(MAX_TIME_KEY, String(next));
  return next;
}

/** After a successful ONLINE activation/refresh the server clock is authoritative again. */
export function resetTrustedTime(serverNowMs: number, store: Store = localStorage) {
  store.setItem(MAX_TIME_KEY, String(serverNowMs));
}

export function trustedTime(store: Store = localStorage) {
  return Number(store.getItem(MAX_TIME_KEY)) || 0;
}

/** Full local check (used at startup, after activation/refresh, and on each mutation via cached payload). */
export async function currentLicense(store: Store = localStorage, now = Date.now()): Promise<LicenseState> {
  const stored = readStoredLicense(store);
  const device = await installDeviceId(store);
  const state = await evaluateLicense(stored?.token, { device, now, maxTrusted: trustedTime(store) });
  if (state.status === "valid" && stored?.serverStatus) return { status: stored.serverStatus, reason: LICENSE_REASON[stored.serverStatus], payload: state.payload };
  if (state.status !== "clock") bumpTrustedTime(now, store);
  if (state.payload) bumpTrustedTime(state.payload.iat * 1000, store);
  return state;
}

/** Cheap synchronous re-check of an already signature-verified payload (time only), for the mutation gate. */
export function recheckPayload(payload: LicensePayload | undefined, now: number, maxTrusted: number): LicenseState {
  if (!payload) return { status: "none", reason: LICENSE_REASON.none };
  if (now < Math.max(maxTrusted, payload.iat * 1000) - ROLLBACK_TOLERANCE_MS) return { status: "clock", reason: LICENSE_REASON.clock, payload };
  if (now >= payload.exp * 1000) return { status: "expired", reason: LICENSE_REASON.expired, payload };
  if (now >= payload.olu * 1000) return { status: "offline_expired", reason: LICENSE_REASON.offline_expired, payload };
  return { status: "valid", reason: LICENSE_REASON.valid, payload };
}

export function normalizeActivationCode(raw: string) {
  const s = raw.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{20}$/.test(s) ? s.match(/.{5}/g)!.join("-") : null;
}
