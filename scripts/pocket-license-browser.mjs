// 1.15.0 license-state smoke on the TEST build (run via scripts/pocket-browser-suite.mjs).
// All names/phones are SYNTHETIC test fixtures. Activation-code screenshots contain no real code.
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { pocketRoot } from "./pocket-license-fixture.mjs";

const valid = JSON.parse(process.env.POCKET_TEST_LICENSE || "null");
const expired = JSON.parse(process.env.POCKET_TEST_EXPIRED || "null");
assert.ok(valid && expired, "run via scripts/pocket-browser-suite.mjs");
const root = resolve(pocketRoot());
const shots = "/workspace/screenshots/pocket-1.15.0";
await mkdir(shots, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, "." + new URL(req.url, "http://l").pathname);
    if (!path.startsWith(root + "/")) throw Error();
    res.setHeader("Content-Type", { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" }[extname(path)] || "application/octet-stream");
    res.end(await readFile(path));
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/index.html`;
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const verdict = { ok: false, steps: [], errors: [] };
const step = (s) => { verdict.steps.push(s); console.log("✓", s); };

try {
  const context = await browser.newContext({ viewport: { width: 360, height: 760 }, reducedMotion: "reduce" });
  await context.addInitScript(([secret]) => {
    if (!localStorage.getItem("qa.seeded")) {
      localStorage.setItem("qa.seeded", "1");
      localStorage.setItem("pocket.app.settings.v1", JSON.stringify({ locale: "fa", professionId: "tattoo_artist", onboarded: true }));
      localStorage.setItem("pocket.account.email.v1", "qa@example.invalid");
      localStorage.setItem("pocket.install.secret.v1", secret);
      localStorage.setItem("pocket.license.lastRefresh.v1", String(Date.now()));
    }
  }, [valid.secret]);
  const page = await context.newPage();
  page.on("pageerror", (e) => verdict.errors.push(e.message));
  await page.route("**/api/**", (r) => r.fulfill({ status: 503, contentType: "application/json", body: '{"error":"offline test"}' }));
  const card = page.getByTestId("license-card").first();
  const status = async (want) => { await page.waitForFunction((w) => document.querySelector('[data-testid="license-card"]')?.getAttribute("data-status") === w || (w === "valid" && !document.querySelector('[data-testid="license-card"]')), want); };
  const setToken = async (token, extra = {}) => {
    await page.evaluate(([t, e]) => {
      if (t) localStorage.setItem("pocket.license.v1", JSON.stringify({ token: t })); else localStorage.removeItem("pocket.license.v1");
      for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v);
    }, [token, extra]);
    await page.reload();
    await page.getByRole("tablist").waitFor();
  };
  const tryAdd = async (name, phone) => {
    await page.getByRole("button", { name: "ثبت نوبت همین روز", exact: true }).click();
    await page.getByRole("textbox", { name: "اسم مشتری", exact: true }).fill(name);
    if (phone) await page.getByRole("textbox", { name: "موبایل", exact: true }).fill(phone);
    await page.getByRole("button", { name: "ذخیره", exact: true }).click();
  };

  // 1) Fresh install, no license: clear activation screen; writes blocked at the mutation layer.
  await page.goto(base);
  await page.getByRole("tablist").waitFor();
  await status("none");
  assert.match(await page.getByTestId("license-reason").innerText(), /کد فعال‌سازی|ورود صاحب برنامه/);
  await page.getByRole("button", { name: /ورود صاحب برنامه/ }).waitFor();
  await page.screenshot({ path: `${shots}/locked-none-360.png` });
  await tryAdd("مشتری نمونهٔ قفل", "");
  await page.getByText(/اطلاعات شما حفظ شده/).first().waitFor();
  assert.equal(await page.getByText("مشتری نمونهٔ قفل", { exact: true }).count(), 0);
  step("no license → activation card shown, add booking blocked with reason");
  // Bad code: rejected locally without a network call.
  await page.locator("#pocket-license-code").fill("bad");
  await page.getByRole("button", { name: "فعال‌سازی", exact: true }).click();
  await page.getByText(/کد ۲۰ حرفی/).first().waitFor();
  step("malformed activation code rejected");
  await page.getByRole("button", { name: "انصراف", exact: true }).click().catch(() => undefined);

  // 2) Valid signed license → writes work; call/SMS/WhatsApp links intact.
  await setToken(valid.token);
  await status("valid");
  await tryAdd("مشتری نمونه", "09120000001");
  await page.getByText("مشتری نمونه", { exact: true }).first().waitFor();
  const hrefs = await page.locator("[data-action]").evaluateAll((els) => els.map((e) => [e.getAttribute("data-action"), e.getAttribute("href")]));
  const h = Object.fromEntries(hrefs);
  assert.match(h.call ?? "", /^tel:/); assert.match(h.sms ?? "", /^sms:/); assert.match(h.whatsapp ?? "", /^https:\/\/wa\.me\/98912/);
  step("valid license → booking saved; tel/sms/WhatsApp hrefs " + JSON.stringify(h));
  await page.getByRole("tab", { name: /پشتیبان/ }).click();
  await page.getByTestId("license-valid-text").waitFor();
  await page.screenshot({ path: `${shots}/backup-valid-360.png` });
  await page.getByRole("tab", { name: /تقویم/ }).click();

  // 3) Expired license → data kept and readable, contacts work, JSON/PDF export reachable, writes blocked.
  await setToken(expired.token);
  await status("expired");
  await page.getByText("مشتری نمونه", { exact: true }).first().waitFor();
  assert.ok((await page.locator('[data-action="call"]').count()) > 0 && (await page.locator('[data-action="whatsapp"]').count()) > 0);
  await page.screenshot({ path: `${shots}/locked-expired-360.png` });
  await tryAdd("مشتری دوم", "");
  await page.getByText(/مهلت مجوز تمام شده است/).first().waitFor();
  assert.equal(await page.getByText("مشتری دوم", { exact: true }).count(), 0);
  await page.getByRole("tab", { name: /پشتیبان/ }).click();
  const dl = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
  await page.getByRole("button", { name: "خروجی JSON", exact: true }).click();
  const file = await dl;
  assert.ok(file, "JSON export must work while expired");
  const json = await readFile(await file.path(), "utf8");
  assert.ok(json.includes("مشتری نمونه"));
  assert.equal(/pocket\.license|pocket\.install|"token"|BEGIN|PRIVATE/i.test(json), false, "backup must not contain license/install secrets");
  await page.getByRole("button", { name: /PDF/ }).waitFor();
  await page.screenshot({ path: `${shots}/backup-expired-360.png` });
  step("expired → data kept, contacts kept, JSON export works (no license material inside), writes blocked");

  // 4) Tampered token → invalid.
  const [b, sig] = valid.token.split(".");
  await setToken(`${b}.${sig.slice(0, -4)}AAAA`);
  await status("invalid");
  step("tampered signature → invalid");

  // 5) Clock rollback vs recorded trusted time → blocked with explanation.
  await setToken(valid.token, { "pocket.license.maxTime.v1": String(Date.now() + 3 * 3600e3) });
  await status("clock");
  await page.screenshot({ path: `${shots}/locked-clock-360.png` });
  step("clock rollback detected");

  // 6) Widths: activation card fits with no horizontal overflow.
  await setToken(null, { "pocket.license.maxTime.v1": "0" });
  for (const w of [320, 390, 820]) {
    await page.setViewportSize({ width: w, height: w > 500 ? 1180 : 760 });
    await status("none");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const clipped = await page.evaluate(() => [...document.querySelectorAll('[data-testid="license-card"] *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width && (r.left < -0.5 || r.right > innerWidth + 0.5); }).length);
    assert.ok(over <= 0 && clipped === 0, `overflow at ${w}`);
    await page.screenshot({ path: `${shots}/locked-none-${w}.png` });
  }
  step("activation card fits 320/390/820");
  assert.deepEqual(verdict.errors, []);
  verdict.ok = true;
} catch (e) {
  verdict.failure = String(e?.stack || e);
} finally {
  await writeFile(`${shots}/license-verdict.json`, JSON.stringify(verdict, null, 2));
  await browser.close(); server.close();
}
console.log(JSON.stringify({ ok: verdict.ok, failure: verdict.failure?.slice(0, 1500), errors: verdict.errors }, null, 2));
if (!verdict.ok) process.exit(1);
