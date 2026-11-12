// 1.16.0: English UI shows a Gregorian month (Sunday first, LTR); Persian UI keeps the Jalali month (RTL).
// A booking saved from either view lands on the same Jalali day key. Checks 360 and 390 px widths.
// Synthetic QA rows only; no network (all non-local requests are aborted).
import { applyTestLicense, pocketRoot } from "./pocket-license-fixture.mjs";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = resolve(pocketRoot());
const shots = "/workspace/screenshots";
await mkdir(shots, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, "." + new URL(req.url, "http://local").pathname);
    if (!path.startsWith(root + "/")) throw Error();
    res.setHeader("Content-Type", { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".woff2": "font/woff2" }[extname(path)] || "application/octet-stream");
    res.end(await readFile(path));
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const verdict = { ok: false, checks: [], errors: [] };
try {
  for (const width of [360, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    await applyTestLicense(context);
    await context.addInitScript(() => {
      if (!localStorage.getItem("pocket.app.settings.v1"))
        localStorage.setItem("pocket.app.settings.v1", JSON.stringify({ locale: "en", professionId: "tattoo_artist", onboarded: true }));
      localStorage.setItem("pocket.account.email.v1", "qa@example.invalid");
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => verdict.errors.push(e.message));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
    await page.goto(base + "/index.html");
    await page.getByRole("tablist").waitFor();
    const expect = await page.evaluate(() => {
      const now = new Date(Date.now() + 3.5 * 3600 * 1000);
      return { title: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(now), day: now.getUTCDate() };
    });
    assert.equal(await page.locator("main").getAttribute("dir"), "ltr");
    assert.equal((await page.locator(".pocket-cal-head .pocket-title").innerText()).trim(), expect.title);
    const heads = await page.locator(".pocket-weekrow p").allInnerTexts();
    assert.deepEqual(heads, ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    const today = page.locator('.pocket-day[aria-current="date"]');
    assert.equal((await today.innerText()).trim(), String(expect.day));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow (en)");
    await page.screenshot({ path: `${shots}/pocket-1.16.0-en-${width}.png`, fullPage: true });
    // Save a booking on today's cell from the English view.
    await today.click();
    await page.getByRole("button", { name: /Add|appointment/i }).last().click();
    await page.getByRole("textbox").first().fill("QA English row");
    const save = page.getByRole("button", { name: "Save", exact: true });
    await save.dblclick(); // double tap must not create two rows
    await page.getByText("QA English row", { exact: true }).first().waitFor();
    await page.waitForTimeout(300);
    assert.equal(await page.locator(".pocket-booking-card").filter({ hasText: "QA English row" }).count(), 1, "double tap stored once");
    const keys = await page.evaluate(() => new Promise((res) => {
      const r = indexedDB.open("tattoo-pocket", 2);
      r.onsuccess = () => { const q = r.result.transaction("bookings").objectStore("bookings").getAll(); q.onsuccess = () => res(q.result.map((b) => b.day)); };
    }));
    const jalaliToday = await page.evaluate(() => {
      const p = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      const g = (t) => p.find((x) => x.type === t).value;
      return `${g("year")}-${g("month")}-${g("day")}`;
    });
    assert.deepEqual(keys, [jalaliToday], "stored under the Jalali key");
    // Switch to Persian: Jalali grid, RTL, same row on the same day.
    await page.evaluate(() => localStorage.setItem("pocket.app.settings.v1", JSON.stringify({ locale: "fa", professionId: "tattoo_artist", onboarded: true })));
    await page.reload();
    await page.getByRole("tablist").waitFor();
    assert.equal(await page.locator("main").getAttribute("dir"), "rtl");
    assert.deepEqual(await page.locator(".pocket-weekrow p").allInnerTexts(), ["ش", "ی", "د", "س", "چ", "پ", "ج"]);
    await page.getByText("QA English row", { exact: true }).first().waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow (fa)");
    await page.screenshot({ path: `${shots}/pocket-1.16.0-fa-${width}.png`, fullPage: true });
    verdict.checks.push(`${width}px: en Gregorian (Sun-first, LTR, today=${expect.day}) + fa Jalali (RTL); one row under ${jalaliToday}`);
    await context.close();
  }
  assert.deepEqual(verdict.errors, []);
  verdict.ok = true;
} catch (error) {
  verdict.failure = String(error?.stack || error);
} finally {
  console.log(JSON.stringify(verdict, null, 2));
  await browser.close();
  server.close();
  if (!verdict.ok) process.exitCode = 1;
}
