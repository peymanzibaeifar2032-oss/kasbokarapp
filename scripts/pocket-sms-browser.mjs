import { applyTestLicense, pocketRoot } from "./pocket-license-fixture.mjs";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
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
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  acceptDownloads: true,
});
await applyTestLicense(context);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/api/**", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }),
);
const screenshot = async (name) => {
  const path = `/workspace/screenshots/pocket-1.14.4-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
};
const download = async (label, name) => {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: label, exact: true }).click();
  const result = await event;
  await result.saveAs(`${out}/${name}`);
  return result;
};
const shots = [];
const shot = async (name) => { const p = `/workspace/screenshots/pocket-1.15.1/${name}.png`; await page.screenshot({ path: p, fullPage: true }); shots.push(p); };
await mkdir("/workspace/screenshots/pocket-1.15.1", { recursive: true });
const decodeSms = (href) => decodeURIComponent(href.split(/[?&]body=/)[1] || "");
try {
  await page.goto(base + "/index.html");
  await page.getByRole("button", { name: "ادامه", exact: true }).click();
  await page.getByRole("textbox", { name: "جستجوی شغل" }).fill("تاتو");
  await page.locator("button").filter({ hasText: /تاتو/ }).first().click();
  await page.getByRole("button", { name: "شروع", exact: true }).click();
  await page.getByPlaceholder("name@email.com").fill("qa@example.invalid");
  await page.getByRole("button", { name: "ادامه", exact: true }).click();
  await page.waitForTimeout(400);
  for (const w of [320, 360, 390, 820]) { await page.setViewportSize({ width: w, height: 844 }); await page.waitForTimeout(150);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert.ok(ov <= 1, `overflow ${w}: ${ov}`); await shot(`home-empty-${w}`); }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "ثبت نوبت همین روز", exact: true }).click();
  await page.getByRole("textbox", { name: "اسم مشتری", exact: true }).fill("سارا آزمایشی");
  await page.getByRole("textbox", { name: "طرح", exact: true }).fill("خط ظریف");
  await page.getByRole("textbox", { name: "موبایل", exact: true }).fill("09120000000");
  await page.locator("input[type=time]").fill("14:30");
  await page.getByRole("button", { name: "ذخیره", exact: true }).click();
  await page.waitForTimeout(400);
  await shot("home-booking-390");
  await page.getByTestId("sms-toggle").first().click();
  const choices = await page.locator("[data-sms]").count();
  assert.ok(choices >= 14, `choices ${choices}`);
  await page.locator('[data-sms="confirm"]').click();
  const text = await page.getByTestId("sms-text").inputValue();
  assert.ok(text.includes("سارا آزمایشی") && !/undefined|null|NaN/.test(text), "confirm text");
  const href = await page.getByTestId("sms-open").getAttribute("href");
  assert.ok(href.startsWith("sms:"), href); assert.equal(decodeSms(href), text);
  await page.getByTestId("sms-text").fill(text + "\nتست");
  assert.equal(decodeSms(await page.getByTestId("sms-open").getAttribute("href")), text + "\nتست");
  await shot("sms-preview-390");
  await page.getByTestId("all-appointments").click();
  await shot("all-appointments-390");
  // cash + trainees
  await page.locator(".pocket-hero-tile.is-cash").click(); await page.waitForTimeout(200); await shot("cash-390");
  await page.setViewportSize({ width: 320, height: 844 }); await shot("cash-320");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 1, "cash overflow 320");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".pocket-tabs").getByText("هنرجوها", { exact: true }).click(); await page.waitForTimeout(200);
  await page.getByRole("textbox", { name: "نام" }).first().fill("علی هنرجو");
  await page.getByPlaceholder("موبایل").first().fill("09120000001");
  await page.locator("form").first().locator("button[type=submit]").first().click();
  await page.waitForTimeout(300);
  await page.getByTestId("trainee-sms-toggle").first().click();
  await page.locator('[data-sms="trainee-joined"]').first().click();
  await page.waitForFunction(() => document.querySelector('[data-testid="sms-text"]')?.value, null, { timeout: 5000 }).catch(() => {});
  const tt = await page.getByTestId("sms-text").inputValue();
  assert.ok(tt.includes("علی") && !/undefined|null|NaN/.test(tt), "trainee text");
  assert.equal(decodeSms(await page.getByTestId("sms-open").getAttribute("href")), tt);
  await shot("trainees-390"); await page.setViewportSize({ width: 320, height: 844 }); await shot("trainees-320");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, choices, shots }, null, 2));
} finally { await browser.close(); server.close(); }
