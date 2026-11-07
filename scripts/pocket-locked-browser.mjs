import { applyTestLicense, pocketRoot } from "./pocket-license-fixture.mjs";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const root = resolve(pocketRoot());
const out = resolve("artifacts/qa-1.15.2-locked");
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
// NO license: locked state
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
// Locked (no license) regression: read-only data stays visible; call/SMS/WhatsApp/Instagram links stay; payment writes are refused.
// Synthetic booking only; external URLs are never navigated (hrefs are read, not clicked).
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
try {
  await page.goto(base + "/index.html");
  await page.getByRole("button", { name: "ادامه", exact: true }).click();
  await page.getByRole("textbox", { name: "جستجوی شغل" }).fill("تاتو");
  await page.locator("button").filter({ hasText: /تاتو/ }).first().click();
  await page.getByRole("button", { name: "شروع", exact: true }).click();
  await page.getByPlaceholder("name@email.com").fill("qa@example.invalid");
  await page.getByRole("button", { name: "ادامه", exact: true }).click();
  await page.waitForTimeout(300);
  const day = await page.evaluate(() => {
    const p = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const g = (t) => p.find((x) => x.type === t).value;
    return `${g("year")}-${g("month")}-${g("day")}`;
  });
  await page.evaluate((day) => new Promise((res, rej) => {
    const r = indexedDB.open("tattoo-pocket", 2);
    r.onupgradeneeded = () => { for (const n of ["bookings", "people", "payments", "metadata"]) if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n, { keyPath: "id" }); };
    r.onsuccess = () => { const tx = r.result.transaction("bookings", "readwrite"); tx.objectStore("bookings").put({ id: "srv-t1", day, name: "مشتری قفل", phone: "09120000001", style: "خط", placement: "", time: "11:00", note: "", serverId: "t1", pinned: false, professionId: "tattoo_artist",
      server: { phone2: "", instagram: "ink.test", sizeCm: "", requestType: "new", idea: "", priceMinToman: 4000000, priceMaxToman: 4000000, depositToman: 500000, paidToman: 1500000, sessionCount: 1, sessionMinutes: 120, bookingId: "b1", slotStart: "" } });
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); };
  }), day);
  await page.reload();
  const card = page.locator(".pocket-booking-card").filter({ hasText: "مشتری قفل" });
  await card.waitFor();
  const hrefs = await card.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  assert.ok(hrefs.includes("tel:09120000001"), JSON.stringify(hrefs));
  assert.ok(hrefs.some((h) => h?.startsWith("sms:09120000001")), "sms");
  assert.ok(hrefs.includes("https://wa.me/989120000001"), "whatsapp");
  assert.ok(hrefs.some((h) => h?.includes("instagram.com/ink.test")), "instagram");
  await page.getByTestId("sms-toggle").first().click();
  await page.locator('[data-sms="confirm"]').click();
  const smsHref = await page.getByTestId("sms-open").getAttribute("href");
  assert.ok(smsHref.startsWith("sms:"), "SMS composer works while locked");
  await card.getByTestId("booking-pay-open").click();
  await card.getByTestId("booking-pay-amount").fill("500000");
  await card.getByTestId("booking-pay-save").click();
  await card.getByRole("alert").waitFor();
  const alert = await card.getByRole("alert").innerText();
  assert.ok(/فعال|مجوز|لایسنس|اطلاعات شما حفظ/.test(alert), alert);
  const cash = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open("pocket-cash", 2); r.onupgradeneeded = () => {}; r.onsuccess = () => { if (!r.result.objectStoreNames.contains("entries")) return res([]); const q = r.result.transaction("entries").objectStore("entries").getAll(); q.onsuccess = () => res(q.result); }; }));
  assert.equal(cash.length, 0, "no cash row while locked");
  assert.ok((await card.getByTestId("booking-paid").innerText()).includes("۱,۵۰۰,۰۰۰"));
  await mkdir("/workspace/screenshots/pocket-1.15.2", { recursive: true });
  await page.screenshot({ path: "/workspace/screenshots/pocket-1.15.2/locked-actions-390.png", fullPage: true });
  console.log(JSON.stringify({ ok: true, hrefs, alert }, null, 2));
} finally { await browser.close(); server.close(); }
