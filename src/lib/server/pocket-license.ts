/**
 * Pocket app manual licensing. Server-only.
 *
 * - Licenses are ES256 (ECDSA P-256, IEEE-P1363 signature) signed tokens the app verifies OFFLINE
 *   against public keys pinned in the APK. The private key never leaves this process: it is either
 *   provided via POCKET_LICENSE_SIGNING_KEY_PEM (runtime env) or generated once and stored AES-256-GCM
 *   wrapped with a key derived (HKDF) from the server runtime secret. Never logged, never exported.
 * - Activation codes are 100-bit CSPRNG values, shown once to the owner, stored only as HMAC hashes.
 * - The device cap is enforced on the server with a single conditional UPDATE (atomic under concurrency).
 * - The server clock is the source of time; tokens carry iat (server now) for client rollback checks.
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, createPrivateKey, createPublicKey, generateKeyPairSync, hkdfSync, randomBytes, randomUUID, sign, timingSafeEqual, verify, type KeyObject } from "node:crypto";

export type LicenseSql = { query: <T = Record<string, unknown>>(q: string, params?: unknown[]) => Promise<T[]> };

export const LICENSE_ISS = "kasbokarapp.com";
export const LICENSE_AUD = "pocket-tattoo-booking";
export const LICENSE_VERSION = 1;
export const DEFAULT_OFFLINE_LEASE_HOURS = 72;
export const MAX_OFFLINE_LEASE_HOURS = 168;
export const MAX_DEVICES = 20;
const MAX_VALIDITY_MS = 3 * 366 * 24 * 3600 * 1000;
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32

export type LicenseErrorCode = "invalid" | "expired" | "revoked" | "device_limit" | "not_yet_valid" | "unavailable" | "bad_request";
export class LicenseError extends Error {
  code: LicenseErrorCode;
  constructor(code: LicenseErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export type LicensePayload = {
  v: number; iss: string; aud: string; kid: string; lid: string; dev: string;
  iat: number; nbf: number; exp: number; olu: number; self: boolean; n: string;
};

const b64u = (b: Buffer) => b.toString("base64url");

// ---------- secrets / keys ----------
function derive(secret: string, info: string) {
  return Buffer.from(hkdfSync("sha256", Buffer.from(secret, "utf8"), Buffer.from("kasbokar-pocket-license"), Buffer.from(info), 32));
}

export function licenseRuntimeSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const s = env.POCKET_LICENSE_KEY_SECRET?.trim() || env.BETTER_AUTH_SECRET?.trim() || "";
  return s.length >= 32 ? s : null;
}

export function wrapPrivateKey(pkcs8Pem: string, secret: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", derive(secret, "signing-key-wrap-v1"), iv);
  const ct = Buffer.concat([c.update(pkcs8Pem, "utf8"), c.final()]);
  return `v1.${b64u(iv)}.${b64u(c.getAuthTag())}.${b64u(ct)}`;
}

export function unwrapPrivateKey(wrapped: string, secret: string) {
  const [v, iv, tag, ct] = wrapped.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new LicenseError("unavailable", "کلید امضا قابل استفاده نیست.");
  const d = createDecipheriv("aes-256-gcm", derive(secret, "signing-key-wrap-v1"), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}

export function kidFor(spkiB64: string) {
  return "k" + createHash("sha256").update(Buffer.from(spkiB64, "base64")).digest("hex").slice(0, 16);
}

export type SigningKey = { kid: string; privateKey: KeyObject; publicSpki: string };

/** Loads (or on first use creates) the signing key. Fails closed if the wrap secret cannot open the stored key. */
export async function getSigningKey(sql: LicenseSql, env: NodeJS.ProcessEnv = process.env): Promise<SigningKey> {
  const pem = env.POCKET_LICENSE_SIGNING_KEY_PEM?.trim();
  if (pem) {
    const privateKey = createPrivateKey(pem.replace(/\\n/g, "\n"));
    const publicSpki = createPublicKey(privateKey).export({ type: "spki", format: "der" }).toString("base64");
    return { kid: kidFor(publicSpki), privateKey, publicSpki };
  }
  const secret = licenseRuntimeSecret(env);
  if (!secret) throw new LicenseError("unavailable", "صدور مجوز روی سرور پیکربندی نشده است.");
  let rows = await sql.query<{ kid: string; public_key_spki: string; private_key_wrapped: string }>(
    "select kid, public_key_spki, private_key_wrapped from pocket_license_signing_keys where slot = 'primary'",
  );
  if (!rows[0]) {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const spki = publicKey.export({ type: "spki", format: "der" }).toString("base64");
    const wrapped = wrapPrivateKey(privateKey.export({ type: "pkcs8", format: "pem" }).toString(), secret);
    await sql.query(
      "insert into pocket_license_signing_keys (kid, slot, public_key_spki, private_key_wrapped) values ($1,'primary',$2,$3) on conflict (slot) do nothing",
      [kidFor(spki), spki, wrapped],
    );
    rows = await sql.query("select kid, public_key_spki, private_key_wrapped from pocket_license_signing_keys where slot = 'primary'");
  }
  const row = rows[0]!;
  let privateKey: KeyObject;
  try {
    privateKey = createPrivateKey(unwrapPrivateKey(row.private_key_wrapped, secret));
  } catch {
    // Never silently rotate: pinned apps would stop trusting new licenses.
    throw new LicenseError("unavailable", "کلید امضای مجوز باز نشد (راز سرور تغییر کرده است).");
  }
  return { kid: row.kid, privateKey, publicSpki: row.public_key_spki };
}

/** Public keys only (safe to publish). */
export async function publicKeys(sql: LicenseSql, env: NodeJS.ProcessEnv = process.env) {
  const k = await getSigningKey(sql, env);
  return [{ kid: k.kid, alg: "ES256", spki: k.publicSpki }];
}

// ---------- tokens ----------
export function signLicense(payload: LicensePayload, key: SigningKey) {
  const body = b64u(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = sign("sha256", Buffer.from(body), { key: key.privateKey, dsaEncoding: "ieee-p1363" });
  return `${body}.${b64u(sig)}`;
}

export function verifyLicenseToken(token: string, keys: { kid: string; spki: string }[]): LicensePayload {
  if (typeof token !== "string" || token.length > 4096) throw new LicenseError("invalid", "مجوز نامعتبر است.");
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) throw new LicenseError("invalid", "مجوز نامعتبر است.");
  let p: LicensePayload;
  try { p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch { throw new LicenseError("invalid", "مجوز نامعتبر است."); }
  const k = keys.find((x) => x.kid === p?.kid);
  if (!k) throw new LicenseError("invalid", "مجوز نامعتبر است.");
  const pub = createPublicKey({ key: Buffer.from(k.spki, "base64"), format: "der", type: "spki" });
  const ok = verify("sha256", Buffer.from(body), { key: pub, dsaEncoding: "ieee-p1363" }, Buffer.from(sig, "base64url"));
  if (!ok || p.v !== LICENSE_VERSION || p.iss !== LICENSE_ISS || p.aud !== LICENSE_AUD) throw new LicenseError("invalid", "مجوز نامعتبر است.");
  return p;
}

// ---------- codes / hashes ----------
export function generateActivationCode() {
  const bytes = randomBytes(20); // one 5-bit symbol per byte (rejection-free: 256 % 32 == 0) → 100 bits
  let s = "";
  for (const b of bytes) s += CODE_ALPHABET[b & 31];
  return s.match(/.{5}/g)!.join("-");
}

export function normalizeCode(raw: unknown) {
  if (typeof raw !== "string") return null;
  const s = raw.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{20}$/.test(s) ? s : null;
}

function hmac(secret: string, label: string, value: string) {
  return createHmac("sha256", derive(secret, "lookup-hmac-v1")).update(`${label}:${value}`).digest("hex");
}

export function isDeviceId(raw: unknown): raw is string {
  return typeof raw === "string" && /^[a-f0-9]{64}$/.test(raw);
}

function hashSecret(env: NodeJS.ProcessEnv) {
  const s = licenseRuntimeSecret(env) || env.POCKET_LICENSE_SIGNING_KEY_PEM?.trim();
  if (!s) throw new LicenseError("unavailable", "صدور مجوز روی سرور پیکربندی نشده است.");
  return s;
}

export function safeEqualHex(a: string, b: string) {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ---------- domain ----------
type LicenseRow = {
  id: string; owner_user_id: string; label: string; is_self: boolean; status: string;
  valid_from: string | Date; expires_at: string | Date; max_devices: number; active_devices: number;
  offline_lease_hours: number; created_at: string | Date; revoked_at: string | Date | null;
};

const ms = (d: string | Date) => new Date(d).getTime();

function issueToken(key: SigningKey, lic: LicenseRow, device: string, now: number) {
  const exp = Math.floor(ms(lic.expires_at) / 1000);
  const nowS = Math.floor(now / 1000);
  const payload: LicensePayload = {
    v: LICENSE_VERSION, iss: LICENSE_ISS, aud: LICENSE_AUD, kid: key.kid, lid: lic.id, dev: device,
    iat: nowS, nbf: Math.floor(ms(lic.valid_from) / 1000), exp,
    olu: Math.min(exp, nowS + lic.offline_lease_hours * 3600), self: !!lic.is_self, n: randomBytes(8).toString("hex"),
  };
  return { token: signLicense(payload, key), payload, serverNow: nowS };
}

function checkUsable(lic: LicenseRow | undefined, now: number) {
  if (!lic || lic.status === "revoked") throw new LicenseError(lic ? "revoked" : "invalid", lic ? "این مجوز لغو شده است." : "کد فعال‌سازی نامعتبر است.");
  if (ms(lic.expires_at) <= now) throw new LicenseError("expired", "مهلت این مجوز تمام شده است. برای تمدید با صاحب برنامه تماس بگیرید.");
  if (ms(lic.valid_from) > now + 120_000) throw new LicenseError("not_yet_valid", "این مجوز هنوز شروع نشده است.");
}

/** Bind device to license; cap enforced atomically by conditional UPDATE. */
async function bindDevice(sql: LicenseSql, lic: LicenseRow, deviceHash: string, label: string | null) {
  const live = await sql.query<{ id: string }>(
    "update pocket_license_activations set last_seen_at = now() where license_id = $1 and device_hash = $2 and released_at is null returning id",
    [lic.id, deviceHash],
  );
  if (live[0]) return live[0].id;
  const slot = await sql.query<{ id: string }>(
    "update pocket_licenses set active_devices = active_devices + 1, updated_at = now() where id = $1 and status = 'active' and active_devices < max_devices returning id",
    [lic.id],
  );
  if (!slot[0]) throw new LicenseError("device_limit", "سقف دستگاه‌های این مجوز پر است. از صاحب برنامه بخواهید دستگاه قبلی را آزاد کند.");
  const id = `act_${randomUUID()}`;
  const ins = await sql.query<{ id: string }>(
    "insert into pocket_license_activations (id, license_id, device_hash, device_label) values ($1,$2,$3,$4) on conflict do nothing returning id",
    [id, lic.id, deviceHash, label],
  );
  if (!ins[0]) {
    // Same device raced itself: give the slot back.
    await sql.query("update pocket_licenses set active_devices = greatest(active_devices - 1, 0) where id = $1", [lic.id]);
    const again = await sql.query<{ id: string }>(
      "select id from pocket_license_activations where license_id = $1 and device_hash = $2 and released_at is null", [lic.id, deviceHash]);
    if (!again[0]) throw new LicenseError("invalid", "فعال‌سازی انجام نشد.");
    return again[0].id;
  }
  return ins[0].id;
}

export async function activateWithCode(sql: LicenseSql, input: { code: unknown; device: unknown; label?: unknown }, env = process.env, now = Date.now()) {
  const code = normalizeCode(input.code);
  if (!code || !isDeviceId(input.device)) throw new LicenseError("invalid", "کد فعال‌سازی نامعتبر است.");
  const secret = hashSecret(env);
  const key = await getSigningKey(sql, env);
  const rows = await sql.query<LicenseRow>("select * from pocket_licenses where code_hash = $1 and not is_self", [hmac(secret, "code", code)]);
  const lic = rows[0];
  // Revoked and unknown codes get the same answer (no oracle for guessed codes).
  if (!lic || lic.status === "revoked") throw new LicenseError("invalid", "کد فعال‌سازی نامعتبر است.");
  checkUsable(lic, now);
  const label = typeof input.label === "string" ? input.label.slice(0, 60) : null;
  await bindDevice(sql, lic, hmac(secret, "dev", input.device), label);
  return { ...issueToken(key, lic, input.device, now), license: publicView(lic) };
}

export async function refreshLicense(sql: LicenseSql, input: { token: unknown; device: unknown }, env = process.env, now = Date.now()) {
  if (!isDeviceId(input.device)) throw new LicenseError("invalid", "مجوز نامعتبر است.");
  const secret = hashSecret(env);
  const key = await getSigningKey(sql, env);
  const p = verifyLicenseToken(String(input.token ?? ""), [{ kid: key.kid, spki: key.publicSpki }]);
  if (!safeEqualHex(p.dev, input.device)) throw new LicenseError("invalid", "این مجوز برای این دستگاه نیست.");
  const lic = (await sql.query<LicenseRow>("select * from pocket_licenses where id = $1", [p.lid]))[0];
  checkUsable(lic, now);
  const act = await sql.query<{ id: string }>(
    "update pocket_license_activations set last_seen_at = now() where license_id = $1 and device_hash = $2 and released_at is null returning id",
    [p.lid, hmac(secret, "dev", input.device)],
  );
  if (!act[0]) throw new LicenseError("revoked", "این دستگاه از مجوز جدا شده است. دوباره فعال کنید.");
  return { ...issueToken(key, lic!, input.device, now), license: publicView(lic!) };
}

/** Owner's own devices: authenticated owner session → self license (no code). Caller MUST verify owner. */
export async function selfLicense(sql: LicenseSql, ownerUserId: string, input: { device: unknown }, env = process.env, now = Date.now()) {
  if (!isDeviceId(input.device)) throw new LicenseError("bad_request", "شناسهٔ دستگاه نامعتبر است.");
  const secret = hashSecret(env);
  const key = await getSigningKey(sql, env);
  const exp = new Date(now + 365 * 24 * 3600 * 1000).toISOString();
  await sql.query(
    `insert into pocket_licenses (id, owner_user_id, label, is_self, self_user_id, expires_at, max_devices, offline_lease_hours, valid_from)
     values ($1,$2,'مجوز شخصی صاحب برنامه',true,$2,$3,5,$4,$5)
     on conflict (self_user_id) where is_self do update set expires_at = greatest(pocket_licenses.expires_at, excluded.expires_at), updated_at = now()`,
    [`lic_${randomUUID()}`, ownerUserId, exp, DEFAULT_OFFLINE_LEASE_HOURS, new Date(now).toISOString()],
  );
  const lic = (await sql.query<LicenseRow>("select * from pocket_licenses where is_self and self_user_id = $1", [ownerUserId]))[0];
  checkUsable(lic, now);
  await bindDevice(sql, lic!, hmac(secret, "dev", input.device), "owner");
  return { ...issueToken(key, lic!, input.device, now), license: publicView(lic!) };
}

function publicView(l: LicenseRow) {
  return {
    id: l.id, label: l.label, self: !!l.is_self, status: l.status,
    validFrom: new Date(l.valid_from).toISOString(), expiresAt: new Date(l.expires_at).toISOString(),
    maxDevices: l.max_devices, activeDevices: l.active_devices, offlineLeaseHours: l.offline_lease_hours,
  };
}

// ---------- owner admin (caller MUST have verified owner session) ----------
function parseExpiry(raw: unknown, now: number) {
  const t = typeof raw === "string" ? Date.parse(raw) : NaN;
  if (!Number.isFinite(t) || t <= now) throw new LicenseError("bad_request", "تاریخ پایان باید در آینده باشد.");
  if (t - now > MAX_VALIDITY_MS) throw new LicenseError("bad_request", "حداکثر اعتبار ۳ سال است.");
  return new Date(t).toISOString();
}
function intIn(raw: unknown, min: number, max: number, def: number, msg: string) {
  if (raw === undefined || raw === null || raw === "") return def;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) throw new LicenseError("bad_request", msg);
  return n;
}

export async function ownerIssue(sql: LicenseSql, ownerUserId: string, raw: Record<string, unknown>, env = process.env, now = Date.now()) {
  const secret = hashSecret(env);
  await getSigningKey(sql, env); // fail before showing a code that cannot be used
  const label = String(raw.label ?? "").trim().slice(0, 80);
  if (label.length < 2) throw new LicenseError("bad_request", "نام مشتری/برچسب را بنویسید.");
  const expiresAt = parseExpiry(raw.expiresAt, now);
  const maxDevices = intIn(raw.maxDevices, 1, MAX_DEVICES, 1, `تعداد دستگاه ۱ تا ${MAX_DEVICES}.`);
  const lease = intIn(raw.offlineLeaseHours, 1, MAX_OFFLINE_LEASE_HOURS, DEFAULT_OFFLINE_LEASE_HOURS, "مهلت آفلاین ۱ تا ۱۶۸ ساعت.");
  const code = generateActivationCode();
  const id = `lic_${randomUUID()}`;
  await sql.query(
    `insert into pocket_licenses (id, owner_user_id, label, code_hash, expires_at, max_devices, offline_lease_hours, valid_from)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, ownerUserId, label, hmac(secret, "code", normalizeCode(code)!), expiresAt, maxDevices, lease, new Date(now).toISOString()],
  );
  return { id, code }; // code is returned exactly once; never stored in plaintext
}

export async function ownerReissueCode(sql: LicenseSql, raw: Record<string, unknown>, env = process.env) {
  const secret = hashSecret(env);
  const code = generateActivationCode();
  const rows = await sql.query<{ id: string }>(
    "update pocket_licenses set code_hash = $2, updated_at = now() where id = $1 and not is_self and status = 'active' returning id",
    [String(raw.id ?? ""), hmac(secret, "code", normalizeCode(code)!)],
  );
  if (!rows[0]) throw new LicenseError("bad_request", "مجوز پیدا نشد یا لغو شده است.");
  return { id: rows[0].id, code };
}

export async function ownerUpdate(sql: LicenseSql, raw: Record<string, unknown>, now = Date.now()) {
  const id = String(raw.id ?? "");
  const cur = (await sql.query<LicenseRow>("select * from pocket_licenses where id = $1", [id]))[0];
  if (!cur) throw new LicenseError("bad_request", "مجوز پیدا نشد.");
  const expiresAt = raw.expiresAt === undefined ? new Date(cur.expires_at).toISOString() : parseExpiry(raw.expiresAt, now);
  const maxDevices = intIn(raw.maxDevices, Math.max(1, cur.active_devices), MAX_DEVICES, cur.max_devices, "تعداد دستگاه کمتر از دستگاه‌های فعال نمی‌شود؛ اول دستگاه را آزاد کنید.");
  const lease = intIn(raw.offlineLeaseHours, 1, MAX_OFFLINE_LEASE_HOURS, cur.offline_lease_hours, "مهلت آفلاین ۱ تا ۱۶۸ ساعت.");
  await sql.query(
    "update pocket_licenses set expires_at = $2, max_devices = $3, offline_lease_hours = $4, updated_at = now() where id = $1",
    [id, expiresAt, maxDevices, lease],
  );
  return { ok: true };
}

export async function ownerRevoke(sql: LicenseSql, raw: Record<string, unknown>) {
  const rows = await sql.query<{ id: string }>(
    "update pocket_licenses set status = 'revoked', revoked_at = now(), updated_at = now() where id = $1 and not is_self returning id",
    [String(raw.id ?? "")],
  );
  if (!rows[0]) throw new LicenseError("bad_request", "مجوز پیدا نشد (مجوز شخصی صاحب برنامه لغوشدنی نیست).");
  return { ok: true };
}

export async function ownerReleaseDevice(sql: LicenseSql, raw: Record<string, unknown>) {
  const rows = await sql.query<{ license_id: string }>(
    "update pocket_license_activations set released_at = now() where id = $1 and released_at is null returning license_id",
    [String(raw.activationId ?? "")],
  );
  if (!rows[0]) throw new LicenseError("bad_request", "دستگاه پیدا نشد.");
  await sql.query("update pocket_licenses set active_devices = greatest(active_devices - 1, 0), updated_at = now() where id = $1", [rows[0].license_id]);
  return { ok: true };
}

export async function ownerList(sql: LicenseSql, env = process.env) {
  let keyStatus: { ok: boolean; kid?: string; error?: string } = { ok: false };
  try { const k = await getSigningKey(sql, env); keyStatus = { ok: true, kid: k.kid }; } catch (e) { keyStatus = { ok: false, error: (e as Error).message }; }
  const lics = await sql.query<LicenseRow>("select * from pocket_licenses order by is_self desc, created_at desc limit 500");
  const acts = await sql.query<{ id: string; license_id: string; device_label: string | null; created_at: string; last_seen_at: string }>(
    "select id, license_id, device_label, created_at, last_seen_at from pocket_license_activations where released_at is null order by created_at",
  );
  return {
    keyStatus,
    licenses: lics.map((l) => ({
      ...publicView(l),
      devices: acts.filter((a) => a.license_id === l.id).map((a) => ({ id: a.id, label: a.device_label, createdAt: new Date(a.created_at).toISOString(), lastSeenAt: new Date(a.last_seen_at).toISOString() })),
    })),
  };
}
