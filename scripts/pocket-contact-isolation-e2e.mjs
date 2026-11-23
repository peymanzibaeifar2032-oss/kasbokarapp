// E2E isolation check for «تقویم نوبت رنگی» contact codes, against the REAL route handlers
// (/api/pocket-license, /api/save, Better Auth) on an in-process PGlite database (no DATABASE_URL).
// All accounts/data are synthetic. Prints only statuses; never prints codes, tokens or cookies.
// Run: node scripts/pocket-contact-isolation-e2e.mjs
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "vite";

delete process.env.DATABASE_URL;
process.env.BETTER_AUTH_SECRET ||= "e2e-only-secret-" + randomBytes(24).toString("hex");
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
const out = { ok: false, checks: [] };
const check = (name, got, want) => { out.checks.push({ name, got, want, pass: want.includes(got) }); };
try {
  const { getSql } = await server.ssrLoadModule("/src/lib/db.ts");
  const lic = await server.ssrLoadModule("/src/lib/server/pocket-license.ts");
  const licRoute = (await server.ssrLoadModule("/src/routes/api/pocket-license.ts")).Route;
  const saveRoute = (await server.ssrLoadModule("/src/routes/api/save.ts")).Route;
  const { auth } = await server.ssrLoadModule("/src/lib/auth/server.ts");
  const sql = await getSql();
  await lic.getSigningKey(sql);

  // 1) Owner issues a contact code (domain call = what the owner-gated panel action runs).
  const issued = await lic.ownerIssue(sql, "e2e-owner", { kind: "contact", label: "مخاطب آزمایشی", note: "خدماتی", expiresAt: new Date(Date.now() + 365 * 864e5).toISOString(), offlineLeaseHours: 168 });
  const device = createHash("sha256").update(randomBytes(32)).digest("hex");
  const post = (route, body, headers = {}) => route.options.server.handlers.POST({ request: new Request("http://localhost/x", { method: "POST", headers: { "Content-Type": "application/json", "sec-fetch-site": "same-origin", ...headers }, body: JSON.stringify(body) }) });

  // 2) Contact phone activates over the public cookie-less endpoint.
  const actRes = await post(licRoute, { op: "activate", code: issued.code, device, label: "e2e" });
  check("activate contact code", actRes.status, [200]);
  const act = await actRes.json();
  const payload = JSON.parse(Buffer.from(act.token.split(".")[0], "base64url").toString());
  check("token scope", payload.scope, ["local"]);
  check("token self", payload.self, [false]);
  check("activation reply keys", Object.keys(act).sort().join(","), ["license,payload,serverNow,token"]);

  // 3) The contact license used every way a client could try → owner-data endpoints refuse.
  const ownerTypes = ["studioPocketExport", "studioPocketAccess", "studioPocketImport", "studioMonthFinance", "createStudioJob", "pocketLicenseList", "pocketLicenseIssue"];
  const tries = {
    "no credentials": {},
    "Bearer contact token": { Authorization: `Bearer ${act.token}` },
    "cookie = contact token": { Cookie: `better-auth.session_token=${act.token}; __Secure-better-auth.session_token=${act.token}` },
    "x-pocket-license header": { "x-pocket-license": act.token },
  };
  for (const [how, headers] of Object.entries(tries)) {
    for (const type of ownerTypes) {
      const res = await post(saveRoute, { type, payload: { token: act.token, device, license: act.token } }, headers);
      check(`${type} with ${how}`, res.status, [401]);
    }
  }

  // 4) A real signed-in NON-owner account (e.g. the contact signs up on the site) still gets no owner data.
  const email = `contact-${randomBytes(4).toString("hex")}@example.invalid`;
  const signUp = await auth.api.signUpEmail({ body: { email, password: "E2e-" + randomBytes(9).toString("hex"), name: "مخاطب" }, asResponse: true });
  const setCookie = signUp.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  check("non-owner sign-up", signUp.status, [200]);
  for (const type of ["studioPocketExport", "studioPocketImport", "pocketLicenseList", "pocketLicenseIssue", "pocketLicenseReactivate", "pocketLicenseNote"]) {
    const res = await post(saveRoute, { type, payload: {} }, { Cookie: cookie });
    const body = await res.json();
    check(`${type} as signed-in non-owner`, res.status, [403]);
    assert.equal(JSON.stringify(body).includes("bookings"), false);
  }
  const access = await (await post(saveRoute, { type: "studioPocketAccess", payload: {} }, { Cookie: cookie })).json();
  check("studioPocketAccess non-owner isOwner", access?.account?.isOwner ?? access?.isOwner ?? false, [false]);

  // 5) Refresh keeps working without any session; after disable it is refused.
  check("refresh (no session)", (await post(licRoute, { op: "refresh", token: act.token, device })).status, [200]);
  await lic.ownerRevoke(sql, { id: issued.id });
  check("refresh after disable", (await post(licRoute, { op: "refresh", token: act.token, device })).status, [403]);
  await lic.ownerReactivate(sql, { id: issued.id });
  check("refresh after re-enable", (await post(licRoute, { op: "refresh", token: act.token, device })).status, [200]);
  out.ok = out.checks.every((c) => c.pass);
} catch (e) {
  out.failure = String(e?.stack || e).slice(0, 2000);
} finally {
  await server.close();
}
const shown = out.checks.map((c) => `${c.pass ? "✓" : "✗"} ${c.name}: ${JSON.stringify(c.got)}`);
console.log(shown.join("\n"));
console.log(JSON.stringify({ ok: out.ok, total: out.checks.length, failed: out.checks.filter((c) => !c.pass).length, failure: out.failure }));
process.exit(out.ok ? 0 : 1);
