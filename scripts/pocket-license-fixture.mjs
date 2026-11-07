// @ts-nocheck -- test-only helper
// TEST-ONLY license fixture helpers (throwaway in-memory key per run; never pinned in the APK build).
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";

export function makeTestIssuer() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const spki = publicKey.export({ type: "spki", format: "der" }).toString("base64");
  const kid = "ktest" + createHash("sha256").update(spki).digest("hex").slice(0, 11);
  const issue = (claims) => {
    const body = Buffer.from(JSON.stringify({ v: 1, iss: "kasbokarapp.com", aud: "pocket-tattoo-booking", kid, n: randomBytes(4).toString("hex"), self: false, ...claims })).toString("base64url");
    return `${body}.${sign("sha256", Buffer.from(body), { key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url")}`;
  };
  return { kid, spki, keys: [{ kid, spki }], issue };
}

export function testInstall() {
  const secret = randomBytes(32).toString("hex");
  const device = createHash("sha256").update("pocket-install:" + secret).digest("hex");
  return { secret, device };
}

/** Browser scripts: inject a TEST license (from the suite runner) into a context. No-op without one. */
export async function applyTestLicense(context, override = process.env.POCKET_TEST_LICENSE) {
  if (!override) return;
  const { secret, token } = JSON.parse(override);
  await context.addInitScript(([s, t]) => {
    localStorage.setItem("pocket.install.secret.v1", s);
    if (t) localStorage.setItem("pocket.license.v1", JSON.stringify({ token: t }));
    localStorage.setItem("pocket.license.lastRefresh.v1", String(Date.now()));
  }, [secret, token]);
}

export const pocketRoot = () => process.env.POCKET_ROOT || "public/apps/pocket-offline";
