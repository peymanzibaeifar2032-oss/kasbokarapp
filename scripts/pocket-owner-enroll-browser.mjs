import { applyTestLicense, pocketRoot } from "./pocket-license-fixture.mjs";
import { createServer as createHttps } from "node:https";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
// Throwaway self-signed TLS so the fake asset origin is a secure context (WebCrypto), like the real WebView asset loader.
const tlsKey = "/tmp/pk-test.key", tlsCrt = "/tmp/pk-test.crt";
if (!existsSync(tlsKey)) execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", tlsKey, "-out", tlsCrt, "-days", "2", "-subj", "/CN=appassets.androidplatform.net"], { stdio: "ignore" });
const createServer = (handler) => createHttps({ key: readFileSync(tlsKey), cert: readFileSync(tlsCrt) }, handler);
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const root = resolve(pocketRoot());
const out = resolve("artifacts/qa-1.15.1");
await mkdir(out, { recursive: true });
await mkdir("/workspace/screenshots", { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, "." + new URL(req.url, "http://local").pathname);
    if (!path.startsWith(root + "/")) throw Error();
    const bytes = await readFile(path);
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".woff2": "font/woff2",
      }[extname(path)] || "application/octet-stream",
    );
    res.end(bytes);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `https://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--host-resolver-rules=MAP appassets.androidplatform.net 127.0.0.1"] });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  acceptDownloads: true,
  ignoreHTTPSErrors: true,
});

// Owner auto-enrollment (1.15.3). A FAKE native bridge stands in for MainActivity/PocketExportClient:
// it answers selfPocketLicense with 401 (no site session), 403 (non-owner session) or 200 + a TEST self token
// issued by the suite's throwaway key for THIS install's device. No real site, cookie or production key involved.
const self = JSON.parse(process.env.POCKET_TEST_SELF);
const other = JSON.parse(process.env.POCKET_TEST_SELF_OTHER);
const host = base.replace("127.0.0.1", "appassets.androidplatform.net");
await context.addInitScript(([secret, token, otherToken]) => {
  if (!localStorage.getItem("pocket.install.secret.v1")) localStorage.setItem("pocket.install.secret.v1", secret);
  const calls = JSON.parse(localStorage.getItem("fake.calls") || "[]");
  const reply = (id, status, data) => setTimeout(() => window.dispatchEvent(new CustomEvent("pocket-export-result", { detail: { requestId: id, status, data } })), 30);
  window.AndroidApp = {
    selfPocketLicense(id, device) {
      calls.push(["self", device]); localStorage.setItem("fake.calls", JSON.stringify(calls));
      const session = localStorage.getItem("fake.session"); // what the native CookieManager would hold
      if (!session) return reply(id, 401, { error: "لطفاً دوباره با ایمیل وارد شوید." });
      if (session === "customer") return reply(id, 403, { error: "Forbidden: دسترسی مدیریت مجوز ندارید." });
      if (session === "owner-wrong-device") return reply(id, 200, { token: otherToken, serverNow: Math.floor(Date.now() / 1000) });
      return reply(id, 200, { token, serverNow: Math.floor(Date.now() / 1000) });
    },
    openPocketLogin() {
      calls.push(["login"]); localStorage.setItem("fake.calls", JSON.stringify(calls));
      // Native: site login in the WebView, then finishPocketLogin() reloads the offline page.
      localStorage.setItem("fake.session", localStorage.getItem("fake.nextSession") || "owner");
      setTimeout(() => location.reload(), 50);
    },
    refreshPocketLicense(id) { reply(id, 0, null); },
  };
}, [self.secret, self.token, other.token]);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/api/**", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }),
);
const card = () => page.getByTestId("license-card").first();
const status = () => card().getAttribute("data-status");
const waitValid = async () => { await page.locator(".pocket-tabs").getByText("پشتیبان", { exact: true }).click(); await waitStatus("valid"); await page.locator(".pocket-tabs").getByText("تقویم", { exact: true }).click(); };
const waitStatus = async (want) => { for (let i = 0; i < 80; i++) { if ((await status()) === want) return; await page.waitForTimeout(100); } assert.equal(await status(), want); };
try {
  await page.goto(host + "/index.html");
  await page.getByRole("button", { name: "ادامه", exact: true }).click();
  await page.getByRole("textbox", { name: "جستجوی شغل" }).fill("تاتو");
  await page.locator("button").filter({ hasText: /تاتو/ }).first().click();
  await page.getByRole("button", { name: "شروع", exact: true }).click();
  await page.getByPlaceholder("name@email.com").fill("qa@example.invalid");
  await page.getByRole("button", { name: "ادامه", exact: true }).click();
  if (process.env.DEBUG_PROBE) console.log("PROBE", JSON.stringify(await page.evaluate(() => ({ sec: window.isSecureContext, subtle: !!crypto.subtle, host: location.host }))), JSON.stringify(errors));
  await waitStatus("none");
  await page.getByTestId("license-owner-help").first().waitFor();
  // 1) non-owner site session → 403, stays locked, no code shown
  await page.evaluate(() => localStorage.setItem("fake.session", "customer"));
  await page.getByTestId("license-owner").first().click();
  await page.getByText(/این حساب سایت صاحب برنامه نیست/).first().waitFor();
  await waitStatus("none");
  // 2) wrong-device token from the server is never accepted
  await page.evaluate(() => localStorage.setItem("fake.session", "owner-wrong-device"));
  await page.getByTestId("license-owner").first().click();
  await page.waitForTimeout(600);
  assert.notEqual(await status(), "valid", "token for another device must not unlock");
  // 3) no session → login opens once; after return the self license is requested AUTOMATICALLY (no second tap)
  await page.evaluate(() => { localStorage.removeItem("fake.session"); localStorage.removeItem("pocket.license.v1"); localStorage.setItem("fake.calls", "[]"); });
  await page.reload();
  await waitStatus("none");
  await page.getByTestId("license-owner").first().click();
  await page.waitForEvent("load");
  await page.waitForTimeout(800);
  await waitValid();
  const calls = await page.evaluate(() => JSON.parse(localStorage.getItem("fake.calls") || "[]"));
  assert.deepEqual(calls.map((c) => c[0]), ["self", "login", "self"], JSON.stringify(calls));
  assert.equal(calls[0][1], calls[2][1], "same device id before and after login");
  assert.equal(await page.evaluate(() => localStorage.getItem("pocket.license.ownerPending.v1")), null, "pending flag cleared");

  // 4) mutations unlocked and the license survives a restart
  await page.getByRole("button", { name: "ثبت نوبت همین روز", exact: true }).click();
  await page.getByRole("textbox", { name: "اسم مشتری", exact: true }).fill("مالک آزمایشی");
  await page.getByRole("button", { name: "ذخیره", exact: true }).click();
  await page.getByText("نوبت ذخیره شد.").first().waitFor();
  await page.reload();
  await waitValid();
  await page.getByText("مالک آزمایشی").first().waitFor();
  const stored = await page.evaluate(() => localStorage.getItem("pocket.license.v1") || "");
  assert.ok(!/secret|private|spki|BEGIN/i.test(stored), "stored lease has no key material");
  await mkdir("/workspace/screenshots/pocket-1.15.3", { recursive: true });
  await page.screenshot({ path: "/workspace/screenshots/pocket-1.15.3/owner-enrolled-390.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, calls: calls.map((c) => c[0]) }, null, 2));
} finally { await browser.close(); server.close(); }
