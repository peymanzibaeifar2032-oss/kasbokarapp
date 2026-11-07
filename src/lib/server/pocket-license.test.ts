import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  LicenseError, activateWithCode, generateActivationCode, getSigningKey, normalizeCode, ownerIssue, ownerList,
  ownerReissueCode, ownerReleaseDevice, ownerRevoke, ownerUpdate, publicKeys, refreshLicense, selfLicense, verifyLicenseToken,
} from "./pocket-license.ts";

// All data is synthetic test fixture data. Real migrations are applied to an in-memory PGlite.
const env = { BETTER_AUTH_SECRET: "test-only-secret-" + "x".repeat(40) } as NodeJS.ProcessEnv;
let db: PGlite;
const sql = { query: async <T>(q: string, p: unknown[] = []) => (await db.query(q, p)).rows as T[] };
const dev = () => createHash("sha256").update(randomBytes(32)).digest("hex");
const day = 864e5;
const future = (d: number) => new Date(Date.now() + d * day).toISOString();
const code = async (e: Promise<unknown>) => { try { await e; return "ok"; } catch (err) { return err instanceof LicenseError ? err.code : String(err); } };

before(async () => {
  db = new PGlite();
  for (const f of readdirSync(join(process.cwd(), "migrations")).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(process.cwd(), "migrations", f), "utf8"));
  }
});

describe("pocket licensing", () => {
  it("codes are high-entropy, unique and normalized", () => {
    const set = new Set(Array.from({ length: 2000 }, generateActivationCode));
    assert.equal(set.size, 2000);
    const c = [...set][0]!;
    assert.match(c, /^[0-9A-Z]{5}(-[0-9A-Z]{5}){3}$/);
    assert.equal(normalizeCode(c.toLowerCase().replace(/-/g, " ")), c.replace(/-/g, ""));
    assert.equal(normalizeCode("short"), null);
  });

  it("signing key: stored wrapped, never plaintext; wrong secret fails closed (no silent rotation)", async () => {
    const k = await getSigningKey(sql, env);
    const row = (await sql.query<{ private_key_wrapped: string }>("select private_key_wrapped from pocket_license_signing_keys"))[0]!;
    assert.ok(row.private_key_wrapped.startsWith("v1."));
    assert.ok(!row.private_key_wrapped.includes("PRIVATE KEY"));
    assert.equal((await getSigningKey(sql, env)).kid, k.kid);
    assert.equal(await code(getSigningKey(sql, { BETTER_AUTH_SECRET: "another-secret-".padEnd(48, "y") } as NodeJS.ProcessEnv)), "unavailable");
    assert.equal(await code(getSigningKey(sql, {} as NodeJS.ProcessEnv)), "unavailable");
    const pub = await publicKeys(sql, env);
    assert.equal(JSON.stringify(pub).includes("PRIVATE"), false);
  });

  it("issue → activate → verify; code stored only as hash", async () => {
    const { id, code: c } = await ownerIssue(sql, "owner", { label: "مشتری آزمایشی", expiresAt: future(30) }, env);
    const raw = JSON.stringify(await sql.query("select * from pocket_licenses where id = $1", [id]));
    assert.equal(raw.includes(c.replace(/-/g, "")), false);
    assert.equal(raw.includes(c), false);
    const d = dev();
    const r = await activateWithCode(sql, { code: c, device: d }, env);
    const keys = await publicKeys(sql, env);
    const p = verifyLicenseToken(r.token, keys);
    assert.equal(p.dev, d); assert.equal(p.lid, id); assert.equal(p.self, false);
    assert.ok(p.olu <= p.exp && p.olu - p.iat <= 72 * 3600);
    // re-activating same device does not consume a slot
    await activateWithCode(sql, { code: c, device: d }, env);
    assert.equal((await ownerList(sql, env)).licenses.find((l) => l.id === id)!.activeDevices, 1);
  });

  it("device cap 1 by default; concurrent activations cannot exceed cap", async () => {
    const { id, code: c } = await ownerIssue(sql, "owner", { label: "cap", expiresAt: future(10), maxDevices: 2 }, env);
    const results = await Promise.all(Array.from({ length: 6 }, () => code(activateWithCode(sql, { code: c, device: dev() }, env))));
    assert.equal(results.filter((x) => x === "ok").length, 2);
    assert.ok(results.filter((x) => x !== "ok").every((x) => x === "device_limit"));
    assert.equal((await sql.query<{ n: number }>("select count(*)::int n from pocket_license_activations where license_id=$1 and released_at is null", [id]))[0]!.n, 2);
    const one = await ownerIssue(sql, "owner", { label: "default", expiresAt: future(10) }, env);
    assert.equal(await code(activateWithCode(sql, { code: one.code, device: dev() }, env)), "ok");
    assert.equal(await code(activateWithCode(sql, { code: one.code, device: dev() }, env)), "device_limit");
  });

  it("invalid / tampered / wrong-device / expired / revoked / reissued", async () => {
    assert.equal(await code(activateWithCode(sql, { code: generateActivationCode(), device: dev() }, env)), "invalid");
    assert.equal(await code(activateWithCode(sql, { code: "x", device: dev() }, env)), "invalid");
    const { id, code: c } = await ownerIssue(sql, "owner", { label: "tt", expiresAt: future(5) }, env);
    const d = dev();
    const { token } = await activateWithCode(sql, { code: c, device: d }, env);
    const keys = await publicKeys(sql, env);
    const [body, sig] = token.split(".");
    const p = JSON.parse(Buffer.from(body!, "base64url").toString());
    const forged = Buffer.from(JSON.stringify({ ...p, exp: p.exp + 9e7, olu: p.olu + 9e7 })).toString("base64url") + "." + sig;
    assert.throws(() => verifyLicenseToken(forged, keys));
    assert.throws(() => verifyLicenseToken(body + "." + Buffer.from(sig!, "base64url").reverse().toString("base64url"), keys));
    assert.throws(() => verifyLicenseToken(token, [{ kid: p.kid, spki: (await_other()) }]));
    assert.equal(await code(refreshLicense(sql, { token, device: dev() }, env)), "invalid");
    assert.equal(await code(refreshLicense(sql, { token, device: d }, env)), "ok");
    // expiry (server time is authoritative)
    assert.equal(await code(refreshLicense(sql, { token, device: d }, env, Date.now() + 6 * day)), "expired");
    // reissue: old code dead, new code works, existing device still refreshes
    const re = await ownerReissueCode(sql, { id }, env);
    assert.equal(await code(activateWithCode(sql, { code: c, device: dev() }, env)), "invalid");
    assert.equal(await code(refreshLicense(sql, { token, device: d }, env)), "ok");
    // extend (renew) then revoke
    await ownerUpdate(sql, { id, expiresAt: future(60) });
    assert.equal(await code(refreshLicense(sql, { token, device: d }, env, Date.now() + 30 * day)), "ok");
    await ownerRevoke(sql, { id });
    assert.equal(await code(refreshLicense(sql, { token, device: d }, env)), "revoked");
    assert.equal(await code(activateWithCode(sql, { code: re.code, device: dev() }, env)), "invalid");
  });

  it("release device frees a slot and blocks that device's refresh", async () => {
    const { id, code: c } = await ownerIssue(sql, "owner", { label: "rel", expiresAt: future(5) }, env);
    const d = dev();
    const { token } = await activateWithCode(sql, { code: c, device: d }, env);
    const act = (await ownerList(sql, env)).licenses.find((l) => l.id === id)!.devices[0]!;
    await ownerReleaseDevice(sql, { activationId: act.id });
    assert.equal(await code(refreshLicense(sql, { token, device: d }, env)), "revoked");
    assert.equal(await code(activateWithCode(sql, { code: c, device: dev() }, env)), "ok");
  });

  it("owner input validation (dates, device cap, offline lease)", async () => {
    assert.equal(await code(ownerIssue(sql, "owner", { label: "x1", expiresAt: new Date(Date.now() - 1000).toISOString() }, env)), "bad_request");
    assert.equal(await code(ownerIssue(sql, "owner", { label: "x1", expiresAt: future(5), maxDevices: 0 }, env)), "bad_request");
    assert.equal(await code(ownerIssue(sql, "owner", { label: "x1", expiresAt: future(5), offlineLeaseHours: 500 }, env)), "bad_request");
    assert.equal(await code(ownerIssue(sql, "owner", { label: "x1", expiresAt: future(5000) }, env)), "bad_request");
  });

  it("owner self license: no code, not revocable, idempotent per owner", async () => {
    const d = dev();
    const a = await selfLicense(sql, "owner-user", { device: d }, env);
    const b = await selfLicense(sql, "owner-user", { device: d }, env);
    assert.equal(a.license.id, b.license.id);
    assert.equal(verifyLicenseToken(a.token, await publicKeys(sql, env)).self, true);
    assert.equal(await code(ownerRevoke(sql, { id: a.license.id })), "bad_request");
  });

  it("list output never contains hashes, codes or key material", async () => {
    const s = JSON.stringify(await ownerList(sql, env));
    assert.equal(/code_hash|device_hash|private|wrapped/i.test(s), false);
  });
});

function await_other() {
  return generateKeyPairSync("ec", { namedCurve: "P-256" }).publicKey.export({ type: "spki", format: "der" }).toString("base64");
}
