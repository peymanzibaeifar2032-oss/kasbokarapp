import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  LicenseError, activateWithCode, ownerIssue, ownerList, ownerNote, ownerReactivate, ownerRevoke, ownerUpdate,
  publicKeys, refreshLicense, selfLicense, verifyLicenseToken,
} from "./pocket-license.ts";

// Contact codes for «تقویم نوبت رنگی». Synthetic fixtures only; real migrations on in-memory PGlite.
const env = { BETTER_AUTH_SECRET: "test-only-secret-" + "z".repeat(40) } as NodeJS.ProcessEnv;
let db: PGlite;
const sql = { query: async <T>(q: string, p: unknown[] = []) => (await db.query(q, p)).rows as T[] };
const dev = () => createHash("sha256").update(randomBytes(32)).digest("hex");
const day = 864e5;
const future = (d: number) => new Date(Date.now() + d * day).toISOString();
const code = async (e: Promise<unknown>) => { try { await e; return "ok"; } catch (err) { return err instanceof LicenseError ? err.code : String(err); } };
const writes = readFileSync(new URL("./writes.ts", import.meta.url), "utf8");
const save = readFileSync(new URL("../../routes/api/save.ts", import.meta.url), "utf8");
const licRoute = readFileSync(new URL("../../routes/api/pocket-license.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../../routes/studio.pocket-contacts.tsx", import.meta.url), "utf8");

before(async () => {
  db = new PGlite();
  for (const f of readdirSync(join(process.cwd(), "migrations")).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(process.cwd(), "migrations", f), "utf8"));
  }
});

describe("pocket contact codes (local-only)", () => {
  it("issue kind=contact with note → activate → token is local-scope, not self, bound to this device", async () => {
    const { id, code: c } = await ownerIssue(sql, "owner", { kind: "contact", label: "مخاطب آزمایشی", note: "آرایشگر", expiresAt: future(365), offlineLeaseHours: 168 }, env);
    const d = dev();
    const r = await activateWithCode(sql, { code: c, device: d, label: "Pixel" }, env);
    const p = verifyLicenseToken(r.token, await publicKeys(sql, env));
    assert.equal(p.scope, "local");
    assert.equal(p.self, false);
    assert.equal(p.dev, d);
    assert.equal(p.lid, id);
    assert.ok(p.olu <= p.exp && p.olu - p.iat <= 168 * 3600);
    // Activation reply carries only the token + public license view: no owner data of any kind.
    assert.deepEqual(Object.keys(r).sort(), ["license", "payload", "serverNow", "token"]);
    const { token: _t, ...rest } = r;
    const leak = JSON.stringify(rest).replaceAll("pocket-tattoo-booking", "").match(/booking|appointment|trainee|payment|finance|cash|phone|email|owner/i);
    assert.equal(leak, null, String(leak));
    const row = (await ownerList(sql, env)).licenses.find((l) => l.id === id)!;
    assert.equal(row.kind, "contact");
    assert.equal(row.note, "آرایشگر");
    assert.equal(row.activeDevices, 1);
  });

  it("plain customer codes keep the old token shape (no scope claim) and default kind", async () => {
    const { id, code: c } = await ownerIssue(sql, "owner", { label: "customer", expiresAt: future(30) }, env);
    const r = await activateWithCode(sql, { code: c, device: dev() }, env);
    assert.equal("scope" in verifyLicenseToken(r.token, await publicKeys(sql, env)), false);
    assert.equal((await ownerList(sql, env)).licenses.find((l) => l.id === id)!.kind, "customer");
  });

  it("each contact gets a separate code; one contact's code never activates another's license", async () => {
    const a = await ownerIssue(sql, "owner", { kind: "contact", label: "AA", expiresAt: future(30) }, env);
    const b = await ownerIssue(sql, "owner", { kind: "contact", label: "BB", expiresAt: future(30) }, env);
    assert.notEqual(a.code, b.code);
    const ra = await activateWithCode(sql, { code: a.code, device: dev() }, env);
    assert.equal(ra.license.id, a.id);
    assert.equal(await code(activateWithCode(sql, { code: a.code, device: dev() }, env)), "device_limit"); // default 1 phone
  });

  it("disable → refresh rejected; re-enable → same phone works again; note edit; expired cannot be re-enabled", async () => {
    const { id, code: c } = await ownerIssue(sql, "owner", { kind: "contact", label: "RR", expiresAt: future(10) }, env);
    const d = dev();
    const { token } = await activateWithCode(sql, { code: c, device: d }, env);
    await ownerRevoke(sql, { id });
    assert.equal(await code(refreshLicense(sql, { token, device: d }, env)), "revoked");
    assert.equal(await code(activateWithCode(sql, { code: c, device: dev() }, env)), "invalid");
    await ownerReactivate(sql, { id });
    assert.equal(await code(refreshLicense(sql, { token, device: d }, env)), "ok");
    assert.equal(await code(ownerReactivate(sql, { id })), "bad_request"); // already active
    await ownerNote(sql, { id, label: "R2", note: "یادداشت" });
    const row = (await ownerList(sql, env)).licenses.find((l) => l.id === id)!;
    assert.equal(row.label, "R2"); assert.equal(row.note, "یادداشت");
    await ownerRevoke(sql, { id });
    assert.equal(await code(ownerReactivate(sql, { id }, Date.now() + 20 * day)), "bad_request");
    await ownerUpdate(sql, { id, expiresAt: future(40) });
    assert.equal(await code(ownerReactivate(sql, { id })), "ok");
  });

  it("owner self license cannot be note-edited, re-enabled or turned into a contact", async () => {
    const s = await selfLicense(sql, "owner-self-2", { device: dev() }, env);
    assert.equal(await code(ownerNote(sql, { id: s.license.id, label: "x y" })), "bad_request");
    assert.equal(await code(ownerReactivate(sql, { id: s.license.id })), "bad_request");
    assert.equal("scope" in verifyLicenseToken(s.token, await publicKeys(sql, env)), false);
  });
});

describe("isolation contract: a contact license can never reach owner data", () => {
  it("/api/save identity comes only from the Better Auth session; no license/token auth exists there", () => {
    assert.match(save, /auth\.api\.getSession\(\{ headers: request\.headers \}\)/);
    assert.match(save, /if \(!session\?\.user\) throw new UnauthorizedError\(\)/);
    assert.equal(/pocket-license|verifyLicenseToken|refreshLicense|Bearer/i.test(save), false);
    assert.equal(/verifyLicenseToken|activateWithCode|refreshLicense/.test(writes), false, "writes.ts never trusts a license token as identity");
  });

  it("the public license endpoint only activates/refreshes; it never dispatches owner actions", () => {
    assert.equal(/dispatchSave|studioPocket|writes/.test(licRoute), false);
    assert.match(licRoute, /op === "activate"/);
    assert.match(licRoute, /op === "refresh"/);
  });

  it("owner-data actions (export/import/finance) are owner-role gated; new contact actions sit behind the license owner gate", () => {
    for (const fn of ["performStudioPocketExport", "performStudioPocketImport"]) {
      const body = writes.slice(writes.indexOf(`async function ${fn}`), writes.indexOf(`async function ${fn}`) + 600);
      assert.match(body, /requireStudioStaff\(userId\)/);
      assert.match(body, /actor\.role !== "owner"/);
    }
    const gate = writes.slice(writes.indexOf("async function performPocketLicenseOwnerAction"), writes.indexOf("async function performPocketLicenseOwnerAction") + 2600);
    assert.ok(gate.indexOf("requireAdmin") < gate.indexOf('case "pocketLicenseReactivate"'));
    assert.ok(gate.indexOf("requireAdmin") < gate.indexOf('case "pocketLicenseNote"'));
    for (const t of ["pocketLicenseReactivate", "pocketLicenseNote"]) {
      const at = writes.lastIndexOf(`case "${t}":`);
      assert.match(writes.slice(at, at + 200), /performPocketLicenseOwnerAction\(userId, type, payload\)/);
    }
  });

  it("panel page issues kind=contact and only lists contact codes", () => {
    assert.match(page, /kind: "contact"/);
    assert.match(page, /l\.kind === "contact" && !l\.self/);
    assert.match(page, /createFileRoute\("\/studio\/pocket-contacts"\)/);
  });
});
